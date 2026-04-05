from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Notification, UserRole
from .commission import calculate_commission, get_transaction_type
from .esewa_gateway import create_payment_payload, is_mock_mode, verify_payment
from .models import Booking, PlatformRevenue
from .serializers import BookingSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def esewa_initiate_payment(request):
    """Return signed eSewa v2 form fields for the browser to POST."""
    booking_id = request.data.get("booking_id")
    try:
        booking_id = int(booking_id)
    except (TypeError, ValueError):
        return Response({"detail": "booking_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        booking = Booking.objects.select_related("service", "service__category").get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    if booking.customer_id != request.user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    if booking.status != Booking.Status.COMPLETED:
        return Response({"detail": "Only completed bookings can be paid."}, status=status.HTTP_400_BAD_REQUEST)

    if booking.payment_status != Booking.BookingPaymentStatus.UNPAID:
        return Response(
            {"detail": "Payment is not required in the current state or was already processed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    total_src = booking.total_amount or booking.service.base_price
    if total_src is None:
        return Response({"detail": "Booking has no price."}, status=status.HTTP_400_BAD_REQUEST)
    total_int = int(Decimal(str(total_src)))

    cat_slug = booking.service.category.slug if booking.service.category_id else None
    t_type = get_transaction_type(cat_slug, total_int)
    comm = calculate_commission(total_int, t_type)

    booking.transaction_type = t_type
    booking.total_amount = Decimal(total_int)
    booking.commission_amount = Decimal(comm["commission"])
    booking.provider_payout_amount = Decimal(comm["provider_payout"])
    booking.save(
        update_fields=[
            "transaction_type",
            "total_amount",
            "commission_amount",
            "provider_payout_amount",
        ]
    )

    fe = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    success_url = f"{fe}/payment/esewa/success"
    failure_url = f"{fe}/payment/esewa/failed"
    payload = create_payment_payload(booking.id, total_int, success_url, failure_url)
    booking.esewa_transaction_uuid = payload["transaction_uuid"]
    booking.save(update_fields=["esewa_transaction_uuid"])

    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def esewa_verify_payment(request):
    """Verify redirect ?data= from eSewa and mark funds as held."""
    raw = request.data.get("data")
    booking_id = request.data.get("booking_id")
    try:
        booking_id = int(booking_id)
    except (TypeError, ValueError):
        return Response({"detail": "booking_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not raw or not isinstance(raw, str):
        return Response({"detail": "data (base64) is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        booking = Booking.objects.select_related("service").get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    if booking.customer_id != request.user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    if booking.payment_status == Booking.BookingPaymentStatus.HELD:
        return Response(
            {"message": "Already verified.", "booking": BookingSerializer(booking, context={"request": request}).data},
            status=status.HTTP_200_OK,
        )

    try:
        verified = verify_payment(raw)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"detail": f"Verification failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    paid = int(float(verified["total_amount"]))
    expected = int(booking.total_amount or booking.service.base_price or 0)
    if paid != expected:
        return Response({"detail": "Amount mismatch — contact support."}, status=status.HTTP_400_BAD_REQUEST)

    if (
        booking.esewa_transaction_uuid
        and verified["transaction_uuid"] != booking.esewa_transaction_uuid
        and not is_mock_mode()
    ):
        return Response({"detail": "Transaction reference mismatch."}, status=status.HTTP_400_BAD_REQUEST)

    booking.payment_status = Booking.BookingPaymentStatus.HELD
    booking.esewa_ref_id = verified.get("transaction_code") or ""
    booking.amount_paid = booking.total_amount
    booking.payment_completed_at = timezone.now()
    booking.save(
        update_fields=[
            "payment_status",
            "esewa_ref_id",
            "amount_paid",
            "payment_completed_at",
        ]
    )

    Notification.objects.create(
        user=booking.service.provider,
        notification_type=Notification.Type.PAYMENT_HELD,
        title="Payment received (held)",
        message=(
            f"Customer paid Rs. {booking.amount_paid} for '{booking.service.title}'. "
            f"Funds are held until the client confirms settlement."
        ),
        related_booking_id=booking.id,
        related_service_id=booking.service.id,
    )

    return Response(
        {"message": "Payment confirmed.", "booking": BookingSerializer(booking, context={"request": request}).data},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_settlement_release(request, booking_id: int):
    """Customer confirms service & payment — release held funds to platform ledger."""
    try:
        booking = Booking.objects.select_related("service").get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if booking.customer_id != request.user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    if booking.payment_status != Booking.BookingPaymentStatus.HELD:
        return Response({"detail": "Payment is not in held state."}, status=status.HTTP_400_BAD_REQUEST)

    if PlatformRevenue.objects.filter(booking=booking).exists():
        return Response({"detail": "Settlement already recorded."}, status=status.HTTP_400_BAD_REQUEST)

    commission = booking.commission_amount or Decimal("0")
    PlatformRevenue.objects.create(
        booking=booking,
        amount=commission,
        revenue_type=str(booking.transaction_type or Booking.TransactionType.BOOKING),
    )

    booking.payment_status = Booking.BookingPaymentStatus.RELEASED
    booking.save(update_fields=["payment_status"])

    payout = booking.provider_payout_amount or Decimal("0")
    Notification.objects.create(
        user=booking.service.provider,
        notification_type=Notification.Type.PAYMENT_RELEASED,
        title="Settlement complete",
        message=(
            f"Booking #{booking.id} for '{booking.service.title}' is settled. "
            f"Recorded payout (after commission): Rs. {payout}."
        ),
        related_booking_id=booking.id,
        related_service_id=booking.service.id,
    )

    return Response(
        {"message": "Booking settled. Revenue logged.", "booking": BookingSerializer(booking, context={"request": request}).data},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_refund_settlement(request, booking_id: int):
    """Admin: mark booking refunded (sandbox — manual eSewa refund in production)."""
    if getattr(request.user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Admin only."}, status=status.HTTP_403_FORBIDDEN)

    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if booking.payment_status != Booking.BookingPaymentStatus.HELD:
        return Response({"detail": "Nothing to refund in held state."}, status=status.HTTP_400_BAD_REQUEST)

    booking.payment_status = Booking.BookingPaymentStatus.REFUNDED
    booking.status = Booking.Status.CANCELLED
    booking.save(update_fields=["payment_status", "status"])

    return Response(
        {
            "message": "Refund marked. Process manually in eSewa merchant portal if live.",
            "booking": BookingSerializer(booking, context={"request": request}).data,
        },
        status=status.HTTP_200_OK,
    )
