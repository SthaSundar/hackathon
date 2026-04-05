from django.db import models
from django.conf import settings
from services.models import Service


class SeasonalEvent(models.Model):
    """Peak-season campaigns (Tihar, Dashain, etc.) for pre-booking banner."""

    name = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["start_date"]

    def __str__(self) -> str:
        return self.name


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        DECLINED = "declined", "Declined"

    class DeliveryPhase(models.TextChoices):
        NONE = "none", "Not started"
        PREPARING = "preparing", "Preparing"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"

    class BookingPaymentStatus(models.TextChoices):
        NOT_DUE = "not_due", "Not due"
        UNPAID = "unpaid", "Unpaid"
        HELD = "held", "Held"
        RELEASED = "released", "Released"
        REFUNDED = "refunded", "Refunded"

    class TransactionType(models.TextChoices):
        DIRECT_PURCHASE = "direct_purchase", "Direct purchase"
        BOOKING = "booking", "Booking"

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="bookings")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    delivery_phase = models.CharField(
        max_length=24,
        choices=DeliveryPhase.choices,
        default=DeliveryPhase.NONE,
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    company_name = models.CharField(max_length=200, blank=True)
    pan = models.CharField(max_length=30, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    review = models.TextField(blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    provider_responded_at = models.DateTimeField(null=True, blank=True)
    customer_cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Payment / settlement (eSewa + legacy Stripe)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    provider_payout_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Amount owed to provider after commission"
    )
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Total charged in NPR for this booking"
    )
    transaction_type = models.CharField(
        max_length=24, choices=TransactionType.choices, default=TransactionType.BOOKING
    )
    payment_status = models.CharField(
        max_length=20,
        choices=BookingPaymentStatus.choices,
        default=BookingPaymentStatus.NOT_DUE,
    )
    payment_completed_at = models.DateTimeField(null=True, blank=True)
    esewa_transaction_uuid = models.CharField(max_length=64, blank=True)
    esewa_ref_id = models.CharField(max_length=128, blank=True)

    is_prebooking = models.BooleanField(default=False)
    seasonal_event = models.ForeignKey(
        SeasonalEvent,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="bookings",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Booking #{self.id} - {self.service.title}"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('stripe', 'Stripe'),
        ('cash', 'Cash'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded')
    ]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=255, null=True, blank=True)
    gateway_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Payment #{self.id} - {self.booking.service.title} - {self.amount}"


class PlatformRevenue(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="platform_revenues")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    revenue_type = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"revenue#{self.id} booking {self.booking_id} {self.amount}"
