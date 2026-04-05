from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from accounts.models import UserRole
from services.service_models import Service
from bookings.models import Booking
from .models import ChatThread, ChatMessage, ChatAccessLog

from accounts.response_time import update_provider_avg_response_hours
from .serializers import ChatThreadSerializer, ChatMessageSerializer


def _is_participant(user, thread: ChatThread) -> bool:
    return user.id in (thread.client_id, thread.provider_id)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_inquiry_thread(request, service_id: int):
    """Start a pre-booking inquiry chat for a service. Client only."""
    user = request.user
    try:
        service = Service.objects.get(id=service_id, is_active=True)
    except Service.DoesNotExist:
        return Response({"detail": "Service not found"}, status=status.HTTP_404_NOT_FOUND)
    if getattr(user, "role", None) != UserRole.CUSTOMER:
        return Response({"detail": "Only customers can start inquiry chats"}, status=status.HTTP_403_FORBIDDEN)
    if service.provider_id == user.id:
        return Response({"detail": "Cannot start inquiry with your own service"}, status=status.HTTP_400_BAD_REQUEST)
    # Reuse existing active inquiry if present
    existing = ChatThread.objects.filter(
        thread_type=ChatThread.Type.INQUIRY,
        service=service,
        client=user,
        provider=service.provider,
        status=ChatThread.Status.ACTIVE
    ).order_by("-created_at").first()
    if existing:
        return Response(ChatThreadSerializer(existing).data)
    expires = timezone.now() + timedelta(hours=48)
    thread = ChatThread.objects.create(
        thread_type=ChatThread.Type.INQUIRY,
        service=service,
        client=user,
        provider=service.provider,
        expires_at=expires,
        status=ChatThread.Status.ACTIVE,
    )
    return Response(ChatThreadSerializer(thread).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def post_message(request, thread_id: int):
    """Post a message to a chat thread. Enforces inquiry vs booking rules."""
    try:
        thread = ChatThread.objects.get(id=thread_id)
    except ChatThread.DoesNotExist:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    if not _is_participant(user, thread):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    if thread.status != ChatThread.Status.ACTIVE:
        return Response({"detail": f"Thread is {thread.status} and cannot accept new messages"}, status=status.HTTP_400_BAD_REQUEST)
    if thread.thread_type == ChatThread.Type.INQUIRY:
        if thread.expires_at and timezone.now() >= thread.expires_at:
            thread.status = ChatThread.Status.EXPIRED
            thread.save(update_fields=["status"])
            return Response({"detail": "Inquiry chat expired"}, status=status.HTTP_400_BAD_REQUEST)
    data = {
        "thread": thread.id,
        "kind": request.data.get("kind") or ChatMessage.Kind.TEXT,
        "content": request.data.get("content") or "",
        "file": request.data.get("file"),
    }
    serializer = ChatMessageSerializer(data=data, context={"thread": thread, "request": request})
    if serializer.is_valid():
        msg = serializer.save(sender=user)
        if (
            thread.thread_type == ChatThread.Type.BOOKING
            and thread.booking_id
            and user.id == thread.provider_id
        ):
            prior = ChatMessage.objects.filter(thread=thread, sender_id=thread.provider_id).exclude(pk=msg.pk).count()
            if prior == 0:
                booking = thread.booking
                if booking:
                    update_provider_avg_response_hours(thread.provider, booking.created_at, timezone.now())
                ChatMessage.objects.filter(pk=msg.pk).update(is_first_response=True)
        return Response(ChatMessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_thread(request, thread_id: int):
    """Get thread info and messages for participants. Admins can access with reason via separate endpoint."""
    try:
        thread = ChatThread.objects.get(id=thread_id)
    except ChatThread.DoesNotExist:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    if not _is_participant(user, thread):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    now = timezone.now()
    if getattr(user, "id", None) == thread.client_id:
        thread.client_last_seen = now
        thread.save(update_fields=["client_last_seen"])
    elif getattr(user, "id", None) == thread.provider_id:
        thread.provider_last_seen = now
        thread.save(update_fields=["provider_last_seen"])
    return Response(ChatThreadSerializer(thread, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_access_thread(request, thread_id: int):
    """Admin access to a thread with role-based restriction and audit log."""
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
    try:
        thread = ChatThread.objects.get(id=thread_id)
    except ChatThread.DoesNotExist:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
    access_type = (request.data.get("access_type") or "").lower()
    reason = (request.data.get("reason") or "").strip()
    valid_types = [t[0] for t in ChatAccessLog.AccessType.choices]
    if access_type not in valid_types or not reason:
        return Response({"detail": "access_type and reason required"}, status=status.HTTP_400_BAD_REQUEST)
    ChatAccessLog.objects.create(thread=thread, admin=user, access_type=access_type, reason=reason)
    return Response({"message": "Access logged", "thread": ChatThreadSerializer(thread, context={"request": request}).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def lock_thread(request, thread_id: int):
    """Lock a thread (admin only)."""
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
    try:
        thread = ChatThread.objects.get(id=thread_id)
    except ChatThread.DoesNotExist:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
    thread.status = ChatThread.Status.LOCKED
    thread.save(update_fields=["status"])
    return Response({"status": thread.status})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_inquiries(request):
    """Provider inbox: list active inquiry threads with unread counts and last message preview."""
    user = request.user
    if getattr(user, "role", None) != UserRole.PROVIDER:
        return Response({"detail": "Only providers can view inquiries."}, status=status.HTTP_403_FORBIDDEN)
    threads = ChatThread.objects.filter(
        thread_type=ChatThread.Type.INQUIRY,
        provider=user,
        status=ChatThread.Status.ACTIVE
    ).select_related("client", "service").prefetch_related("messages")
    data = []
    for t in threads:
        msgs = list(t.messages.all())
        last_msg = msgs[-1] if msgs else None
        last_msg_preview = (last_msg.content[:120] if last_msg and last_msg.content else "")
        last_msg_at = last_msg.created_at.isoformat() if last_msg else None
        unread = 0
        for m in msgs:
            if m.sender_id != user.id:
                if t.provider_last_seen is None or m.created_at > t.provider_last_seen:
                    unread += 1
        expires_in = None
        if t.expires_at:
            delta = (t.expires_at - timezone.now()).total_seconds()
            expires_in = int(delta)
        data.append({
            "id": t.id,
            "client_id": t.client_id,
            "client_email": getattr(t.client, "email", None),
            "client_name": getattr(t.client, "display_name", None),
            "service_id": t.service_id,
            "service_title": getattr(t.service, "title", None),
            "last_message_preview": last_msg_preview,
            "last_message_at": last_msg_at,
            "expires_at": t.expires_at.isoformat() if t.expires_at else None,
            "expires_in_seconds": expires_in,
            "unread_count": unread,
            "privacy_notice": "Messages are private between users. Admins may review chats only in case of disputes, safety issues, or policy violations.",
        })
    return Response(data)
