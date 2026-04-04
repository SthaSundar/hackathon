from rest_framework import serializers
from .models import ChatThread, ChatMessage, ChatAccessLog
from bookings.serializers import BookingSerializer
from services.service_serializers import ServiceSerializer


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "thread", "sender", "sender_email", "sender_name", "kind", "content", "file", "file_url", "created_at"]
        read_only_fields = ["sender", "created_at"]

    def validate(self, attrs):
        thread = self.context.get("thread")
        request = self.context.get("request")
        kind = attrs.get("kind", ChatMessage.Kind.TEXT)
        content = attrs.get("content", "") or ""
        file = attrs.get("file")

        if not thread or not request:
            return attrs

        # Inquiry chat: text only, limit messages per user, block links/contact
        if thread.thread_type == ChatThread.Type.INQUIRY:
            if kind != ChatMessage.Kind.TEXT or file:
                raise serializers.ValidationError({"file": "File sharing is disabled in pre-booking inquiry chats"})
            # Block external links and contact info
            import re
            patterns = [
                r"https?://",  # links
                r"\bwww\.",    # links
                r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",  # email
                r"\+?\d[\d\-\s]{6,}\d",  # phone-like
                r"\bfacebook\.com|\binstagram\.com|\btwitter\.com|\bt\.me|\bwhatsapp",  # social
            ]
            if any(re.search(p, content, re.IGNORECASE) for p in patterns):
                raise serializers.ValidationError({"content": "Sharing external links or contact info is not allowed in inquiry chats"})
            # Per-user message limit (default 10)
            sent_count = ChatMessage.objects.filter(thread=thread, sender=request.user).count()
            if sent_count >= 10:
                raise serializers.ValidationError({"limit": "Message limit reached for inquiry chat"})

        else:
            # Booking chat: allow image/pdf with 5MB limit
            if file:
                max_size = 5 * 1024 * 1024
                if file.size > max_size:
                    raise serializers.ValidationError({"file": "File too large (max 5MB)"})
                ct = getattr(file, "content_type", None) or ""
                allowed = ["image/jpeg", "image/png", "application/pdf"]
                if ct not in allowed:
                    raise serializers.ValidationError({"file": "Only JPG, PNG or PDF files are allowed"})
                if kind == ChatMessage.Kind.TEXT:
                    attrs["kind"] = ChatMessage.Kind.DOCUMENT if ct == "application/pdf" else ChatMessage.Kind.IMAGE
        return attrs

    def get_file_url(self, obj):
        request = self.context.get("request")
        f = obj.file
        if not f:
            return None
        if request:
            try:
                return request.build_absolute_uri(f.url)
            except Exception:
                return f.url
        return f.url

class ChatThreadSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source="client.email", read_only=True)
    client_name = serializers.CharField(source="client.display_name", read_only=True)
    provider_email = serializers.EmailField(source="provider.email", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)
    booking = BookingSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    privacy_notice = serializers.SerializerMethodField()
    has_open_dispute = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = [
            "id",
            "thread_type",
            "status",
            "expires_at",
            "booking",
            "service",
            "client",
            "client_email",
            "client_name",
            "provider",
            "provider_email",
            "provider_name",
            "client_last_seen",
            "provider_last_seen",
            "created_at",
            "updated_at",
            "messages",
            "privacy_notice",
            "has_open_dispute",
        ]
        read_only_fields = ["client", "provider", "created_at", "updated_at"]

    def get_privacy_notice(self, obj):
        return "Messages are private between users. Admins may review chats only in case of disputes, safety issues, or policy violations."

    def get_has_open_dispute(self, obj):
        try:
            from disputes.models import Dispute
            if obj.booking_id:
                return Dispute.objects.filter(booking_id=obj.booking_id, status=Dispute.Status.OPEN).exists()
            return False
        except Exception:
            return False
