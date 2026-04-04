from django.db import models
from django.conf import settings
from services.service_models import Service
from bookings.models import Booking


class ChatThread(models.Model):
    class Type(models.TextChoices):
        INQUIRY = "inquiry", "Inquiry"
        BOOKING = "booking", "Booking"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        LOCKED = "locked", "Locked"
        EXPIRED = "expired", "Expired"

    thread_type = models.CharField(max_length=20, choices=Type.choices)
    booking = models.ForeignKey(Booking, null=True, blank=True, on_delete=models.CASCADE, related_name="chat_thread")
    service = models.ForeignKey(Service, null=True, blank=True, on_delete=models.CASCADE, related_name="inquiry_threads")
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_threads")
    provider = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="provider_threads")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField(null=True, blank=True)
    client_last_seen = models.DateTimeField(null=True, blank=True)
    provider_last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        ctx = self.booking_id or self.service_id or "n/a"
        return f"{self.thread_type} thread #{self.id} ({ctx})"


def chat_upload_path(instance, filename):
    return f"chat/{instance.thread_id}/{filename}"


class ChatMessage(models.Model):
    class Kind(models.TextChoices):
        TEXT = "text", "Text"
        IMAGE = "image", "Image"
        DOCUMENT = "document", "Document"

    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.TEXT)
    content = models.TextField(blank=True)
    file = models.FileField(upload_to=chat_upload_path, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"msg#{self.id} in thread {self.thread_id} by {self.sender_id}"


class ChatAccessLog(models.Model):
    class AccessType(models.TextChoices):
        DISPUTE = "dispute", "Dispute"
        REPORT = "report", "Report"
        SAFETY = "safety", "Safety"
        PAYMENT = "payment", "Payment"

    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name="access_logs")
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_access_logs")
    access_type = models.CharField(max_length=20, choices=AccessType.choices)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"access#{self.id} thread {self.thread_id} by {self.admin_id}"
