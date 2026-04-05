from django.db import models
from django.conf import settings
from bookings.models import Booking
from chats.models import ChatThread

def dispute_upload_path(instance, filename):
    return f"disputes/{instance.id}/{filename}"

class Dispute(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    class Category(models.TextChoices):
        PAYMENT = "payment", "Payment"
        SERVICE_QUALITY = "service_quality", "Service Quality"
        BEHAVIOR = "behavior", "Behavior"
        ABUSE = "abuse", "Abuse"
        OTHER = "other", "Other"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="disputes")
    thread = models.ForeignKey(ChatThread, null=True, blank=True, on_delete=models.SET_NULL, related_name="disputes")
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_disputes")
    category = models.CharField(max_length=50, choices=Category.choices)
    description = models.TextField()
    attachment = models.FileField(upload_to=dispute_upload_path, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"dispute#{self.id} booking {self.booking_id} status {self.status}"
