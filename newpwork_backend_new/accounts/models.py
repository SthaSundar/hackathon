from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.conf import settings

class UserRole(models.TextChoices):
    CUSTOMER = "customer", _("Customer")
    PROVIDER = "provider", _("Provider")
    ADMIN = "admin", _("Admin")

class ProviderCategory(models.TextChoices):
    FLOWER_VENDOR = "flower_vendor", _("Flower Vendor")
    EVENT_DECORATOR = "event_decorator", _("Event Decorator")
    NURSERY_AMC = "nursery_amc", _("Nursery / Office AMC")

class User(AbstractUser):
    """
    Custom user model for marketplace authentication and profiles.
    Extends Django's AbstractUser to keep username behavior but adds marketplace fields.
    """

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CUSTOMER)
    category = models.CharField(
        max_length=30, 
        choices=ProviderCategory.choices, 
        default=ProviderCategory.FLOWER_VENDOR,
        null=True,
        blank=True
    )
    is_featured = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(
        default=False,
        help_text="True after client OTP registration or manual verification; used for budget-tier bookings.",
    )

    # Optional profile fields
    display_name = models.CharField(max_length=150, blank=True)
    avatar_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    address = models.TextField(blank=True, help_text="Used for high-tier (Rs 5,000+) booking eligibility.")

    # OAuth fields (for Google login)
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    access_token = models.CharField(max_length=512, blank=True, null=True)

    freshness_guarantee = models.BooleanField(
        default=False,
        help_text="Provider opted in to 'fresh flowers guaranteed' badge.",
    )
    freshness_violations = models.PositiveSmallIntegerField(default=0)
    avg_response_hours = models.FloatField(null=True, blank=True)
    total_response_count = models.PositiveIntegerField(default=0)

    REQUIRED_FIELDS = ["email"]

    def __str__(self) -> str:
        if self.display_name:
            return self.display_name
        return self.get_username()

    @property
    def is_customer(self) -> bool:
        return self.role == UserRole.CUSTOMER

    @property
    def is_provider(self) -> bool:
        return self.role == UserRole.PROVIDER


class KYCVerification(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kyc_verification")
    
    # Mandatory fields
    photo = models.ImageField(upload_to="kyc/photos/", help_text="Profile photo")
    full_name = models.CharField(max_length=150)
    address = models.TextField()
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    citizenship = models.FileField(upload_to="kyc/citizenship/", help_text="Citizenship document")
    
    # Optional fields
    driving_license = models.FileField(upload_to="kyc/driving_license/", blank=True, null=True)
    passport = models.FileField(upload_to="kyc/passport/", blank=True, null=True)
    
    # Verification status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    category = models.CharField(
        max_length=30, 
        choices=ProviderCategory.choices, 
        null=True, 
        blank=True
    )
    trade_certificate = models.FileField(
        upload_to="kyc/certificates/", 
        blank=True, 
        null=True,
        help_text="Trade or business certificate"
    )
    admin_notes = models.TextField(blank=True, help_text="Admin notes for approval/rejection")
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="verified_kyc"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "KYC Verification"
        verbose_name_plural = "KYC Verifications"

    def __str__(self) -> str:
        return f"KYC for {self.user.email} - {self.status}"

    @property
    def is_verified(self) -> bool:
        return self.status == self.Status.APPROVED


class CustomerBookingIdentity(models.Model):
    """One-time identity details required before a customer can create a booking."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="booking_identity",
    )
    full_name = models.CharField(max_length=150)
    address = models.TextField()
    phone_number = models.CharField(max_length=20)
    citizenship = models.FileField(upload_to="booking_identity/citizenship/")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Customer booking identity"
        verbose_name_plural = "Customer booking identities"

    def __str__(self) -> str:
        return f"Booking identity for {self.user.email}"


class Notification(models.Model):
    class Type(models.TextChoices):
        KYC_SUBMITTED = "kyc_submitted", _("KYC Submitted")
        BOOKING_ACCEPTED = "booking_accepted", _("Booking Accepted")
        BOOKING_CANCELLED = "booking_cancelled", _("Booking Cancelled")
        BOOKING_COMPLETED = "booking_completed", _("Booking Completed")
        BOOKING_DECLINED = "booking_declined", _("Booking Declined")
        BOOKING_REQUESTED = "booking_requested", _("Booking Requested")
        PAYMENT_HELD = "payment_held", _("Payment Held")
        PAYMENT_RELEASED = "payment_released", _("Payment Released")
        DISPUTE_OPENED = "dispute_opened", _("Dispute Opened")
        PASSWORD_CHANGED = "password_changed", _("Password Changed")
        USERNAME_CHANGED = "username_changed", _("Username Changed")
        PROFILE_UPDATED = "profile_updated", _("Profile Updated")
        KYC_APPROVED = "kyc_approved", _("KYC Approved")
        KYC_REJECTED = "kyc_rejected", _("KYC Rejected")
        SERVICE_APPROVED = "service_approved", _("Service Approved")
        SERVICE_REJECTED = "service_rejected", _("Service Rejected")
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=50, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_booking_id = models.IntegerField(null=True, blank=True)
    related_service_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
        ]
    
    def __str__(self) -> str:
        return f"{self.notification_type} - {self.user.email}"
