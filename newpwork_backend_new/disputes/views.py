from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from accounts.models import UserRole
from bookings.models import Booking
from chats.models import ChatThread
from .models import Dispute
from .serializers import DisputeSerializer
from django.db.models import Q

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_dispute(request, booking_id: int):
    user = request.user
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
    is_participant = user.id in (booking.customer_id, booking.service.provider_id)
    if not is_participant:
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    category = (request.data.get("category") or "").lower() or "other"
    description = (request.data.get("description") or "").strip()
    if not description:
        return Response({"detail": "Description required"}, status=status.HTTP_400_BAD_REQUEST)
    thread = ChatThread.objects.filter(booking=booking, thread_type=ChatThread.Type.BOOKING).first()
    dispute = Dispute.objects.create(
        booking=booking,
        thread=thread,
        creator=user,
        category=category,
        description=description,
        attachment=request.data.get("attachment")
    )
    if thread:
        thread.status = ChatThread.Status.LOCKED
        thread.save(update_fields=["status"])
    return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_disputes(request):
    user = request.user
    if getattr(user, "role", None) == UserRole.ADMIN:
        qs = Dispute.objects.select_related("booking", "thread", "creator")
    else:
        qs = Dispute.objects.filter(creator=user).select_related("booking", "thread", "creator")
    return Response(DisputeSerializer(qs, many=True).data)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def close_dispute(request, dispute_id: int):
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Admin required"}, status=status.HTTP_403_FORBIDDEN)
    try:
        dispute = Dispute.objects.get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    notes = (request.data.get("resolution_notes") or "").strip()
    dispute.status = Dispute.Status.CLOSED
    dispute.resolution_notes = notes
    dispute.closed_at = timezone.now()
    dispute.save(update_fields=["status", "resolution_notes", "closed_at"])
    return Response(DisputeSerializer(dispute).data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_disputes(request, booking_id: int):
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    if user.id not in (booking.customer_id, booking.service.provider_id) and getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    qs = Dispute.objects.filter(booking=booking).select_related("booking", "thread", "creator")
    return Response(DisputeSerializer(qs, many=True).data)
