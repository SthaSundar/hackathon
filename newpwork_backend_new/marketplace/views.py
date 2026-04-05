import calendar
from datetime import date, datetime

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import KYCVerification, User, UserRole
from bookings.models import Booking
from .models import BulkInquiry, BulkInquiryResponse, FreshnessReport, ProviderUnavailability


def _verified_provider(user) -> bool:
    if getattr(user, "role", None) != UserRole.PROVIDER:
        return False
    kyc = getattr(user, "kyc_verification", None)
    if not kyc or kyc.status != KYCVerification.Status.APPROVED:
        return False
    return bool(kyc.trade_certificate)


def _bulk_inquiry_to_dict(inq: BulkInquiry, request_user):
    hours_ago = (timezone.now() - inq.created_at).total_seconds() / 3600.0
    resp_count = inq.responses.count()
    base = {
        "id": inq.id,
        "title": inq.title,
        "description": inq.description,
        "event_date": inq.event_date.isoformat() if inq.event_date else None,
        "status": inq.status,
        "created_at": inq.created_at.isoformat(),
        "hours_since_posted": round(hours_ago, 1),
        "response_count": resp_count,
        "client_id": inq.client_id,
        "is_owner": request_user.id == inq.client_id,
    }
    if request_user.id == inq.client_id or getattr(request_user, "role", None) == UserRole.ADMIN:
        base["responses"] = [
            {
                "id": r.id,
                "provider_id": r.provider_id,
                "provider_name": r.provider.display_name or r.provider.email,
                "message": r.message,
                "price_offer": r.price_offer,
                "created_at": r.created_at.isoformat(),
            }
            for r in inq.responses.select_related("provider")
        ]
    return base


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def bulk_inquiries_list_create(request):
    user = request.user
    if request.method == "GET":
        if getattr(user, "role", None) == UserRole.PROVIDER and not _verified_provider(user):
            return Response(
                {"detail": "Only verified providers can view the bulk board."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            BulkInquiry.objects.filter(Q(status=BulkInquiry.Status.OPEN) | Q(client=user))
            .select_related("client")
            .order_by("-created_at")
        )
        return Response([_bulk_inquiry_to_dict(i, user) for i in qs])

    # POST
    if getattr(user, "role", None) != UserRole.CUSTOMER:
        return Response({"detail": "Only clients can post bulk requirements."}, status=status.HTTP_403_FORBIDDEN)
    title = (request.data.get("title") or "").strip()
    if not title:
        return Response({"detail": "title is required."}, status=status.HTTP_400_BAD_REQUEST)
    description = (request.data.get("description") or "").strip()
    event_date_raw = request.data.get("event_date")
    event_date = None
    if event_date_raw:
        try:
            event_date = date.fromisoformat(str(event_date_raw)[:10])
        except ValueError:
            return Response({"detail": "Invalid event_date."}, status=status.HTTP_400_BAD_REQUEST)
    inq = BulkInquiry.objects.create(
        client=user, title=title, description=description, event_date=event_date, status=BulkInquiry.Status.OPEN
    )
    return Response(_bulk_inquiry_to_dict(inq, user), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_inquiry_respond(request, pk: int):
    user = request.user
    if not _verified_provider(user):
        return Response(
            {"detail": "Only verified providers can respond."}, status=status.HTTP_403_FORBIDDEN
        )
    try:
        inq = BulkInquiry.objects.get(pk=pk)
    except BulkInquiry.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if inq.status != BulkInquiry.Status.OPEN:
        return Response({"detail": "Inquiry is closed."}, status=status.HTTP_400_BAD_REQUEST)
    message = (request.data.get("message") or "").strip()
    if not message:
        return Response({"detail": "message is required."}, status=status.HTTP_400_BAD_REQUEST)
    price_raw = request.data.get("price_offer")
    price_offer = None
    if price_raw is not None and str(price_raw).strip() != "":
        try:
            price_offer = int(price_raw)
            if price_offer < 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"detail": "price_offer must be a positive integer (NPR)."}, status=status.HTTP_400_BAD_REQUEST)
    BulkInquiryResponse.objects.create(inquiry=inq, provider=user, message=message, price_offer=price_offer)
    return Response(_bulk_inquiry_to_dict(inq, user), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_inquiry_close(request, pk: int):
    user = request.user
    try:
        inq = BulkInquiry.objects.get(pk=pk, client=user)
    except BulkInquiry.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    inq.status = BulkInquiry.Status.CLOSED
    inq.save(update_fields=["status"])
    return Response(_bulk_inquiry_to_dict(inq, user))


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def provider_availability(request, user_id: int):
    """GET: unavailable dates for month=?YYYY-MM. POST: mark date unavailable (provider only, body {date})."""
    try:
        provider = User.objects.get(id=user_id, role=UserRole.PROVIDER)
    except User.DoesNotExist:
        return Response({"detail": "Provider not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        month_str = request.query_params.get("month")
        if not month_str or len(month_str) < 7:
            return Response({"detail": "month=YYYY-MM is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            y, m = int(month_str[:4]), int(month_str[5:7])
            if m < 1 or m > 12:
                raise ValueError
        except ValueError:
            return Response({"detail": "Invalid month."}, status=status.HTTP_400_BAD_REQUEST)
        _, last_day = calendar.monthrange(y, m)
        start_d = date(y, m, 1)
        end_d = date(y, m, last_day)
        dates = list(
            ProviderUnavailability.objects.filter(
                provider=provider, date__gte=start_d, date__lte=end_d
            ).values_list("date", flat=True)
        )
        return Response({"month": f"{y:04d}-{m:02d}", "unavailable_dates": [d.isoformat() for d in dates]})

    # POST
    user = request.user
    if not user.is_authenticated:
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    if user.id != user_id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    if getattr(user, "role", None) != UserRole.PROVIDER:
        return Response({"detail": "Only providers can set availability."}, status=status.HTTP_403_FORBIDDEN)
    raw = request.data.get("date")
    if not raw:
        return Response({"detail": "date is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        d = date.fromisoformat(str(raw)[:10])
    except ValueError:
        return Response({"detail": "Invalid date."}, status=status.HTTP_400_BAD_REQUEST)
    ProviderUnavailability.objects.get_or_create(provider=user, date=d)
    return Response({"date": d.isoformat(), "unavailable": True})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def provider_availability_delete(request, user_id: int, ad_date: str):
    if request.user.id != user_id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    if getattr(request.user, "role", None) != UserRole.PROVIDER:
        return Response({"detail": "Only providers can set availability."}, status=status.HTTP_403_FORBIDDEN)
    try:
        d = date.fromisoformat(ad_date[:10])
    except ValueError:
        return Response({"detail": "Invalid date."}, status=status.HTTP_400_BAD_REQUEST)
    ProviderUnavailability.objects.filter(provider=request.user, date=d).delete()
    return Response({"date": d.isoformat(), "unavailable": False})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def provider_freshness_guarantee_toggle(request, user_id: int):
    if request.user.id != user_id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    if getattr(request.user, "role", None) != UserRole.PROVIDER:
        return Response({"detail": "Only providers can change this setting."}, status=status.HTTP_403_FORBIDDEN)
    if request.user.freshness_violations >= 2:
        return Response(
            {"detail": "Freshness guarantee is permanently disabled after repeated violations."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    enabled = request.data.get("enabled")
    if not isinstance(enabled, bool):
        return Response({"detail": "enabled (boolean) is required."}, status=status.HTTP_400_BAD_REQUEST)
    request.user.freshness_guarantee = enabled
    request.user.save(update_fields=["freshness_guarantee"])
    return Response({"freshness_guarantee": request.user.freshness_guarantee})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_list_pending_freshness_reports(request):
    if getattr(request.user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
    qs = (
        FreshnessReport.objects.filter(status=FreshnessReport.Status.PENDING)
        .select_related("booking", "client", "provider")
        .order_by("-created_at")[:100]
    )
    return Response(
        [
            {
                "id": r.id,
                "booking_id": r.booking_id,
                "client_email": r.client.email,
                "provider_id": r.provider_id,
                "provider_name": r.provider.display_name or r.provider.email,
                "description": r.description,
                "created_at": r.created_at.isoformat(),
            }
            for r in qs
        ]
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_confirm_freshness_report(request, report_id: int):
    if getattr(request.user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
    try:
        rep = FreshnessReport.objects.select_related("provider").get(id=report_id)
    except FreshnessReport.DoesNotExist:
        return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
    if rep.status != FreshnessReport.Status.PENDING:
        return Response({"detail": "Report already processed."}, status=status.HTTP_400_BAD_REQUEST)
    rep.status = FreshnessReport.Status.CONFIRMED
    rep.save(update_fields=["status"])
    prov = rep.provider
    prov.freshness_violations = (prov.freshness_violations or 0) + 1
    prov.freshness_guarantee = False
    if prov.freshness_violations >= 2:
        prov.freshness_guarantee = False
    prov.save(update_fields=["freshness_violations", "freshness_guarantee"])
    return Response({"status": rep.status, "provider_id": prov.id, "freshness_violations": prov.freshness_violations})
