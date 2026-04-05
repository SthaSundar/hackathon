from django.conf import settings
from django.db import models

from bookings.models import Booking


class BulkInquiry(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bulk_inquiries"
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    event_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class BulkInquiryResponse(models.Model):
    inquiry = models.ForeignKey(BulkInquiry, on_delete=models.CASCADE, related_name="responses")
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bulk_inquiry_responses"
    )
    message = models.TextField()
    price_offer = models.PositiveIntegerField(null=True, blank=True, help_text="NPR")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class ProviderUnavailability(models.Model):
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="unavailable_dates"
    )
    date = models.DateField()

    class Meta:
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(fields=["provider", "date"], name="uniq_provider_unavailability_date"),
        ]


class FreshnessReport(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        DISMISSED = "dismissed", "Dismissed"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="freshness_reports")
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="freshness_reports_filed"
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="freshness_reports_received"
    )
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
