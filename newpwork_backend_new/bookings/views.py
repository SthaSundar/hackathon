from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from accounts.models import UserRole, Notification
from .models import Booking
from .serializers import BookingSerializer


def _booking_payload(booking, request, many=False):
    return BookingSerializer(booking, many=many, context={"request": request}).data
from django.utils.dateparse import parse_date
from datetime import datetime

BOOKING_PREMIUM_THRESHOLD = Decimal("5000")


def _provider_day_blocked(service, day) -> bool:
    try:
        from marketplace.models import ProviderUnavailability

        return ProviderUnavailability.objects.filter(provider_id=service.provider_id, date=day).exists()
    except Exception:
        return False


def _service_price_dec(service):
    p = service.base_price
    if p is None:
        return Decimal("0")
    return Decimal(str(p))


def _can_book_budget_tier(user):
    if getattr(user, "phone_verified", False):
        return True
    if getattr(user, "is_email_verified", False):
        return True
    if getattr(user, "google_id", None):
        return True
    return False


def _profile_complete_premium(user):
    return bool(
        (user.display_name or "").strip()
        and (user.phone_number or "").strip()
        and (user.address or "").strip()
    )


@api_view(["POST"]) 
@permission_classes([IsAuthenticated])
def create_booking(request):
    """Create a booking for a service.
    
    Rules:
    - Any authenticated user can book a service they do not provide.
    - You cannot book your own service.
    - Preferred time (scheduled_for) is required, must be in the future.
    - Prevent double-booking: a pending/confirmed booking on the same service and time is not allowed.
    """
    user = request.user
    serializer = BookingSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    service = serializer.validated_data.get("service")
    scheduled_for = serializer.validated_data.get("scheduled_for")
    
    if not service:
        return Response({"detail": "Service is required.", "errors": {"service": "Service is required"}}, status=status.HTTP_400_BAD_REQUEST)
    
    if service.provider_id == user.id:
        return Response({"detail": "You cannot book your own service.", "errors": {"service": "Cannot book your own service"}}, status=status.HTTP_400_BAD_REQUEST)
    
    if scheduled_for is None:
        return Response({"detail": "Preferred time is required.", "errors": {"scheduled_for": "Select your preferred date and time"}}, status=status.HTTP_400_BAD_REQUEST)
    
    if scheduled_for <= timezone.now():
        return Response({"detail": "Preferred time must be in the future.", "errors": {"scheduled_for": "Please pick a future time"}}, status=status.HTTP_400_BAD_REQUEST)
    
    exists_conflict = Booking.objects.filter(
        service=service,
        scheduled_for=scheduled_for,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
    ).exists()
    if exists_conflict:
        return Response({"detail": "Selected time slot is already taken.", "errors": {"scheduled_for": "This time slot is already taken"}}, status=status.HTTP_409_CONFLICT)

    price = _service_price_dec(service)
    if price >= BOOKING_PREMIUM_THRESHOLD:
        if not _profile_complete_premium(user):
            return Response(
                {
                    "detail": "Services Rs 5,000 and above need a complete profile: your name, phone, and address.",
                    "code": "profile_incomplete",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
    else:
        if not _can_book_budget_tier(user):
            return Response(
                {
                    "detail": "For services under Rs 5,000, verify your phone (sign up with phone OTP) or use a verified email / Google account.",
                    "code": "budget_tier_requirements",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    booking = serializer.save(customer=user, status=Booking.Status.PENDING)
    if booking.service.base_price is not None:
        booking.total_amount = booking.service.base_price
        booking.save(update_fields=["total_amount"])

    Notification.objects.create(
        user=booking.service.provider,
        notification_type=Notification.Type.BOOKING_REQUESTED,
        title="New booking request",
        message=(
            f"{booking.customer.display_name or booking.customer.email} has requested your service "
            f"'{booking.service.title}'. Please review and accept or decline the booking."
        ),
        related_booking_id=booking.id,
        related_service_id=booking.service.id,
    )

    return Response(_booking_payload(booking, request), status=status.HTTP_201_CREATED)


@api_view(["GET"]) 
@permission_classes([IsAuthenticated])
def my_bookings(request):
    """List bookings.
    
    Default: customer view (bookings where you are the customer, excluding your own services).
    Optional: scope=provider to view bookings on your services (provider only).
    """
    user = request.user
    requested_scope = request.query_params.get("scope")
    # Default scope: if provider, show provider view; else customer view
    if requested_scope:
        scope = requested_scope
    else:
        scope = "provider" if getattr(user, "role", None) == UserRole.PROVIDER else "customer"
    if scope == "provider":
        if getattr(user, "role", None) != UserRole.PROVIDER:
            return Response({"detail": "Only providers can view bookings on their services."}, status=status.HTTP_403_FORBIDDEN)
        qs = Booking.objects.filter(service__provider=user)
    else:
        qs = Booking.objects.filter(customer=user).exclude(service__provider=user)
    status_param = request.query_params.get("status")
    if status_param in dict(Booking.Status.choices):
        qs = qs.filter(status=status_param)
    qs = qs.select_related("service", "service__provider", "customer")
    limit_param = request.query_params.get("limit")
    if limit_param:
        try:
            limit_val = max(1, min(int(limit_param), 200))
            qs = qs[:limit_val]
        except ValueError:
            pass
    serializer = BookingSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_detail(request, booking_id: int):
    """Single booking for the customer or the service provider (or admin)."""
    user = request.user
    try:
        booking = Booking.objects.select_related("service", "service__provider", "customer").get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    is_customer = booking.customer_id == user.id
    is_provider = booking.service.provider_id == user.id
    is_admin = getattr(user, "role", None) == UserRole.ADMIN
    if not (is_customer or is_provider or is_admin):
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    return Response(_booking_payload(booking, request))


@api_view(["PATCH"]) 
@permission_classes([IsAuthenticated])
def update_booking_status(request, booking_id: int):
    """Provider can update status for bookings on their services. Customer can cancel own pending."""
    user = request.user
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("status")
    try:
        from disputes.models import Dispute
        has_open_dispute = Dispute.objects.filter(booking=booking, status=Dispute.Status.OPEN).exists()
    except Exception:
        has_open_dispute = False
    if has_open_dispute and getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Booking is frozen due to an active dispute."}, status=status.HTTP_400_BAD_REQUEST)
    if getattr(user, "role", None) == UserRole.PROVIDER:
        if booking.service.provider_id != user.id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        if new_status not in dict(Booking.Status.choices).keys():
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        old_status = booking.status

        if old_status in [Booking.Status.CANCELLED, Booking.Status.COMPLETED, Booking.Status.DECLINED]:
            return Response(
                {"detail": f"Cannot update a booking that is already {old_status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        if new_status == Booking.Status.CONFIRMED:
            if old_status != Booking.Status.PENDING:
                return Response({"detail": "Only pending bookings can be confirmed."}, status=status.HTTP_400_BAD_REQUEST)
            booking.status = Booking.Status.CONFIRMED
            booking.delivery_phase = Booking.DeliveryPhase.NONE
            booking.confirmed_at = now
            booking.provider_responded_at = now
            # Auto-create booking chat thread
            try:
                from chats.models import ChatThread
                ChatThread.objects.get_or_create(
                    thread_type=ChatThread.Type.BOOKING,
                    booking=booking,
                    client=booking.customer,
                    provider=booking.service.provider,
                    defaults={"status": ChatThread.Status.ACTIVE}
                )
            except Exception:
                pass
        elif new_status == Booking.Status.DECLINED:
            if old_status != Booking.Status.PENDING:
                return Response({"detail": "Only pending bookings can be declined."}, status=status.HTTP_400_BAD_REQUEST)
            booking.status = Booking.Status.DECLINED
            booking.provider_responded_at = now
            booking.confirmed_at = None
        elif new_status == Booking.Status.CANCELLED:
            booking.status = Booking.Status.CANCELLED
            booking.provider_responded_at = now
        elif new_status == Booking.Status.COMPLETED:
            if old_status != Booking.Status.CONFIRMED:
                return Response({"detail": "Only confirmed bookings can be marked as completed."}, status=status.HTTP_400_BAD_REQUEST)
            booking.status = Booking.Status.COMPLETED
            if booking.payment_status == Booking.BookingPaymentStatus.NOT_DUE:
                booking.payment_status = Booking.BookingPaymentStatus.UNPAID
            # Keep booking chat open for payment, reviews, and disputes
        else:
            return Response({"detail": "Unsupported status update."}, status=status.HTTP_400_BAD_REQUEST)

        booking.save()
        
        # Create notification for customer
        if new_status == Booking.Status.CONFIRMED and old_status == Booking.Status.PENDING:
            Notification.objects.create(
                user=booking.customer,
                notification_type=Notification.Type.BOOKING_ACCEPTED,
                title="Booking Accepted",
                message=f"Your booking for '{booking.service.title}' has been accepted by the provider.",
                related_booking_id=booking.id,
                related_service_id=booking.service.id
            )
        elif new_status == Booking.Status.CANCELLED:
            Notification.objects.create(
                user=booking.customer,
                notification_type=Notification.Type.BOOKING_CANCELLED,
                title="Booking Cancelled",
                message=f"Your booking for '{booking.service.title}' has been cancelled.",
                related_booking_id=booking.id,
                related_service_id=booking.service.id
            )
        elif new_status == Booking.Status.DECLINED:
            Notification.objects.create(
                user=booking.customer,
                notification_type=Notification.Type.BOOKING_DECLINED,
                title="Booking Declined",
                message=f"Your booking for '{booking.service.title}' has been declined by the provider.",
                related_booking_id=booking.id,
                related_service_id=booking.service.id
            )
        elif new_status == Booking.Status.COMPLETED:
            Notification.objects.create(
                user=booking.customer,
                notification_type=Notification.Type.BOOKING_COMPLETED,
                title="Booking completed",
                message=(
                    f"Your booking for '{booking.service.title}' is marked complete. "
                    f"Please pay via eSewa if you have not yet, leave a review, and use chat if you need support."
                ),
                related_booking_id=booking.id,
                related_service_id=booking.service.id
            )
        
        return Response(_booking_payload(booking, request))
    elif getattr(user, "role", None) == UserRole.CUSTOMER:
        if booking.customer_id != user.id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        if new_status != Booking.Status.CANCELLED:
            return Response({"detail": "Customers can only cancel their bookings."}, status=status.HTTP_400_BAD_REQUEST)
        if booking.status == Booking.Status.CANCELLED:
            return Response({"detail": "Booking is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        if booking.status in [Booking.Status.COMPLETED, Booking.Status.DECLINED]:
            return Response({"detail": "Cannot cancel this booking."}, status=status.HTTP_400_BAD_REQUEST)

        if booking.status == Booking.Status.CONFIRMED and booking.confirmed_at:
            cancel_deadline = booking.confirmed_at + timedelta(hours=24)
            if timezone.now() > cancel_deadline:
                return Response(
                    {"detail": "This booking can no longer be cancelled. The 24 hour cancellation window has passed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        booking.status = Booking.Status.CANCELLED
        booking.customer_cancelled_at = timezone.now()
        booking.save()
        
        # Create notification for provider
        Notification.objects.create(
            user=booking.service.provider,
            notification_type=Notification.Type.BOOKING_CANCELLED,
            title="Booking Cancelled",
            message=f"A booking for '{booking.service.title}' has been cancelled by the customer.",
            related_booking_id=booking.id,
            related_service_id=booking.service.id
        )
        
        return Response(_booking_payload(booking, request))
    else:
        # admin can set any
        if new_status not in dict(Booking.Status.choices).keys():
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()
        if new_status == Booking.Status.CONFIRMED:
            booking.status = Booking.Status.CONFIRMED
            booking.confirmed_at = now
            booking.provider_responded_at = booking.provider_responded_at or now
            try:
                from chats.models import ChatThread
                ChatThread.objects.get_or_create(
                    thread_type=ChatThread.Type.BOOKING,
                    booking=booking,
                    client=booking.customer,
                    provider=booking.service.provider,
                    defaults={"status": ChatThread.Status.ACTIVE}
                )
            except Exception:
                pass
        elif new_status == Booking.Status.DECLINED:
            booking.status = Booking.Status.DECLINED
            booking.provider_responded_at = now
            booking.confirmed_at = None
        elif new_status == Booking.Status.CANCELLED:
            booking.status = Booking.Status.CANCELLED
            if booking.customer_cancelled_at is None:
                booking.customer_cancelled_at = now
        elif new_status == Booking.Status.COMPLETED:
            booking.status = Booking.Status.COMPLETED
            if booking.payment_status == Booking.BookingPaymentStatus.NOT_DUE:
                booking.payment_status = Booking.BookingPaymentStatus.UNPAID
        else:
            booking.status = new_status
        booking.save()
        return Response(_booking_payload(booking, request))


@api_view(["PATCH"]) 
@permission_classes([IsAuthenticated])
def rate_booking(request, booking_id: int):
    """Customer can rate their completed booking (1-5) and leave a review."""
    user = request.user
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if booking.customer_id != user.id:
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    if booking.status != Booking.Status.COMPLETED:
        return Response({"detail": "Only completed bookings can be rated."}, status=status.HTTP_400_BAD_REQUEST)
    rating = request.data.get("rating")
    review = request.data.get("review", "")
    try:
        rating_val = int(rating)
    except (TypeError, ValueError):
        return Response({"detail": "Rating must be an integer"}, status=status.HTTP_400_BAD_REQUEST)
    if rating_val < 1 or rating_val > 5:
        return Response({"detail": "Rating must be between 1 and 5"}, status=status.HTTP_400_BAD_REQUEST)
    booking.rating = rating_val
    booking.review = review
    booking.save()
    return Response(_booking_payload(booking, request))


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_delivery_phase(request, booking_id: int):
    """Provider-only: advance fulfillment tracking while booking is confirmed."""
    user = request.user
    if getattr(user, "role", None) != UserRole.PROVIDER:
        return Response({"detail": "Only providers can update fulfillment."}, status=status.HTTP_403_FORBIDDEN)
    try:
        booking = Booking.objects.select_related("service").get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if booking.service.provider_id != user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    if booking.status != Booking.Status.CONFIRMED:
        return Response(
            {"detail": "Fulfillment updates are only available for confirmed bookings."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    phase = request.data.get("delivery_phase")
    valid = {c[0] for c in Booking.DeliveryPhase.choices}
    if phase not in valid:
        return Response({"detail": "Invalid delivery_phase."}, status=status.HTTP_400_BAD_REQUEST)
    booking.delivery_phase = phase
    booking.save(update_fields=["delivery_phase", "updated_at"])
    return Response(_booking_payload(booking, request))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def service_booked_slots(request, service_id: int):
    """Get booked time slots for a service (confirmed and pending bookings)."""
    from services.models import Service
    from django.utils import timezone
    
    try:
        service = Service.objects.get(id=service_id, is_active=True)
    except Service.DoesNotExist:
        return Response({"detail": "Service not found."}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all confirmed and pending bookings (not cancelled) with scheduled_for
    booked_slots = Booking.objects.filter(
        service=service,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
        scheduled_for__isnull=False
    ).exclude(
        scheduled_for__lt=timezone.now()  # Exclude past bookings
    ).values_list('scheduled_for', flat=True)
    
    booked_times = [t.isoformat() for t in booked_slots]
    return Response({"booked_slots": booked_times})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def service_available_slots(request, service_id: int):
    """Return available time slots for a given service and date.
    
    Query params:
    - date: YYYY-MM-DD (required)
    - interval: minutes (optional, default 60)
    - start_hour: 9 (optional)
    - end_hour: 18 (optional)
    """
    from services.models import Service
    try:
        service = Service.objects.get(id=service_id, is_active=True)
    except Service.DoesNotExist:
        return Response({"detail": "Service not found."}, status=status.HTTP_404_NOT_FOUND)
    
    date_str = request.query_params.get("date")
    if not date_str:
        return Response({"detail": "date (YYYY-MM-DD) is required"}, status=status.HTTP_400_BAD_REQUEST)
    day = parse_date(date_str)
    if not day:
        return Response({"detail": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST)

    if _provider_day_blocked(service, day):
        return Response(
            {
                "date": date_str,
                "available_slots": [],
                "booked_slots": [],
                "provider_day_blocked": True,
            }
        )
    
    try:
        interval = int(request.query_params.get("interval") or 60)
        start_hour = int(request.query_params.get("start_hour") or 9)
        end_hour = int(request.query_params.get("end_hour") or 18)
    except ValueError:
        return Response({"detail": "Invalid slot configuration"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Build candidate slots within business hours
    tznow = timezone.now()
    slots = []
    current = datetime(year=day.year, month=day.month, day=day.day, hour=start_hour, minute=0, second=0, tzinfo=tznow.tzinfo)
    end_dt = datetime(year=day.year, month=day.month, day=day.day, hour=end_hour, minute=0, second=0, tzinfo=tznow.tzinfo)
    while current < end_dt:
        slots.append(current)
        current = current + timedelta(minutes=interval)
    
    # Exclude past slots and already booked ones (pending/confirmed)
    booked_set = set(
        Booking.objects.filter(
            service=service,
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            scheduled_for__date=day
        ).values_list("scheduled_for", flat=True)
    )
    
    available = [
        s.isoformat()
        for s in slots
        if s > tznow and s not in booked_set
    ]
    booked = [b.isoformat() for b in booked_set if b >= tznow]
    return Response({"date": date_str, "available_slots": available, "booked_slots": booked})


@api_view(["GET"])
@permission_classes([AllowAny])
def service_available_slots_public(request, service_id: int):
    """Public variant of available slots for booking UI.
    
    If ?date is provided, behaves like service_available_slots.
    If date is missing, returns a 7-day preview starting tomorrow:
    {
      "days": [
        {"date":"YYYY-MM-DD","available_slots":[iso...],"booked_slots":[iso...]},
        ...
      ]
    }
    """
    from services.models import Service
    try:
        service = Service.objects.get(id=service_id, is_active=True)
    except Service.DoesNotExist:
        return Response({"detail": "Service not found."}, status=status.HTTP_404_NOT_FOUND)
    
    date_str = request.query_params.get("date")
    if date_str:
        # Delegate to authenticated logic but without permission requirements
        request.query_params._mutable = True  # ensure safe mutation in tests
        # Reuse logic inline
        day = parse_date(date_str)
        if not day:
            return Response({"detail": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST)
        if _provider_day_blocked(service, day):
            return Response(
                {
                    "date": date_str,
                    "available_slots": [],
                    "booked_slots": [],
                    "provider_day_blocked": True,
                }
            )
        interval = int(request.query_params.get("interval") or 60)
        start_hour = int(request.query_params.get("start_hour") or 9)
        end_hour = int(request.query_params.get("end_hour") or 18)
        tznow = timezone.now()
        slots = []
        current = datetime(year=day.year, month=day.month, day=day.day, hour=start_hour, minute=0, second=0, tzinfo=tznow.tzinfo)
        end_dt = datetime(year=day.year, month=day.month, day=day.day, hour=end_hour, minute=0, second=0, tzinfo=tznow.tzinfo)
        while current < end_dt:
            slots.append(current)
            current = current + timedelta(minutes=interval)
        booked_set = set(
            Booking.objects.filter(
                service=service,
                status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
                scheduled_for__date=day
            ).values_list("scheduled_for", flat=True)
        )
        available = [s.isoformat() for s in slots if s > tznow and s not in booked_set]
        booked = [b.isoformat() for b in booked_set if b >= tznow]
        return Response({"date": date_str, "available_slots": available, "booked_slots": booked})
    else:
        preview_days = []
        tznow = timezone.now()
        for offset in range(1, 8):
            day = (tznow + timedelta(days=offset)).date()
            if _provider_day_blocked(service, day):
                preview_days.append(
                    {
                        "date": day.isoformat(),
                        "available_slots": [],
                        "booked_slots": [],
                        "provider_day_blocked": True,
                    }
                )
                continue
            start_hour = int(request.query_params.get("start_hour") or 9)
            end_hour = int(request.query_params.get("end_hour") or 18)
            interval = int(request.query_params.get("interval") or 60)
            slots = []
            current = datetime(year=day.year, month=day.month, day=day.day, hour=start_hour, minute=0, second=0, tzinfo=tznow.tzinfo)
            end_dt = datetime(year=day.year, month=day.month, day=day.day, hour=end_hour, minute=0, second=0, tzinfo=tznow.tzinfo)
            while current < end_dt:
                slots.append(current)
                current = current + timedelta(minutes=interval)
            booked_set = set(
                Booking.objects.filter(
                    service=service,
                    status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
                    scheduled_for__date=day
                ).values_list("scheduled_for", flat=True)
            )
            available = [s.isoformat() for s in slots if s > tznow and s not in booked_set]
            booked = [b.isoformat() for b in booked_set if b >= tznow]
            preview_days.append({"date": day.isoformat(), "available_slots": available, "booked_slots": booked})
        return Response({"days": preview_days})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_orders(request):
    """Provider-only: grouped orders view.
    
    Groups:
    - new_requests: pending bookings (newest first)
    - active: confirmed bookings not completed/cancelled/declined (soonest by scheduled_for)
    - completed: completed bookings (newest first)
    """
    user = request.user
    if getattr(user, "role", None) != UserRole.PROVIDER:
        return Response({"detail": "Only providers can view orders."}, status=status.HTTP_403_FORBIDDEN)
    
    base = Booking.objects.filter(service__provider=user).select_related("service", "customer")
    new_requests = base.filter(status=Booking.Status.PENDING).order_by("-created_at")
    active = base.filter(status=Booking.Status.CONFIRMED).order_by("scheduled_for", "-created_at")
    completed = base.filter(status=Booking.Status.COMPLETED).order_by("-updated_at", "-created_at")
    paid_like = [Booking.BookingPaymentStatus.HELD, Booking.BookingPaymentStatus.RELEASED]
    completed_paid = completed.filter(payment_status__in=paid_like)
    completed_unpaid = completed.exclude(payment_status__in=paid_like)

    ctx = {"request": request}
    return Response({
        "counts": {
            "new_requests": new_requests.count(),
            "active": active.count(),
            "completed": completed.count(),
            "completed_paid": completed_paid.count(),
            "completed_unpaid": completed_unpaid.count(),
            "total_completed": completed.count(),
        },
        "new_requests": BookingSerializer(new_requests, many=True, context=ctx).data,
        "active": BookingSerializer(active, many=True, context=ctx).data,
        "completed": BookingSerializer(completed, many=True, context=ctx).data,
        "completed_paid": BookingSerializer(completed_paid, many=True, context=ctx).data,
        "completed_unpaid": BookingSerializer(completed_unpaid, many=True, context=ctx).data,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def upcoming_seasonal_events(request):
    from .models import SeasonalEvent

    today = timezone.now().date()
    cutoff = today + timedelta(days=45)
    events = SeasonalEvent.objects.filter(
        is_active=True,
        start_date__gte=today,
        start_date__lte=cutoff,
    ).order_by("start_date")
    return Response(
        [
            {
                "id": e.id,
                "name": e.name,
                "start_date": e.start_date.isoformat(),
                "end_date": e.end_date.isoformat(),
            }
            for e in events
        ]
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_booking_freshness(request, booking_id: int):
    from marketplace.models import FreshnessReport

    try:
        booking = Booking.objects.select_related("service__provider").get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
    if booking.customer_id != request.user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    if booking.status != Booking.Status.COMPLETED:
        return Response(
            {"detail": "You can only report after the booking is completed."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    desc = (request.data.get("description") or "").strip()
    FreshnessReport.objects.create(
        booking=booking,
        client=request.user,
        provider=booking.service.provider,
        description=desc,
        status=FreshnessReport.Status.PENDING,
    )
    return Response({"message": "Report submitted."}, status=status.HTTP_201_CREATED)
