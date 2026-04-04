from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class ClientProfile(models.Model):
    """
    Client-specific profile extending user information.
    Stores client preferences, settings, and additional client-related data.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_profile"
    )
    
    # Preferences
    preferred_language = models.CharField(
        max_length=10,
        default="en",
        choices=[
            ("en", "English"),
            ("ne", "Nepali"),
            ("hi", "Hindi"),
        ],
        help_text="Preferred language for the interface"
    )
    
    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    push_notifications = models.BooleanField(default=True)
    
    # Additional client information
    default_location = models.CharField(max_length=200, blank=True)
    preferred_currency = models.CharField(max_length=3, default="NPR", help_text="ISO 4217 currency code")
    
    # Client activity tracking
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Client Profile"
        verbose_name_plural = "Client Profiles"
        ordering = ["-created_at"]
    
    def __str__(self) -> str:
        return f"Client Profile for {self.user.email}"
    
    @property
    def is_active_client(self) -> bool:
        """Check if the associated user is a customer"""
        return hasattr(self.user, 'role') and self.user.role == 'customer'


class ClientFavorite(models.Model):
    """
    Store client's favorite services for quick access.
    """
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites"
    )
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.CASCADE,
        related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Client Favorite"
        verbose_name_plural = "Client Favorites"
        unique_together = ["client", "service"]
        ordering = ["-created_at"]
    
    def __str__(self) -> str:
        return f"{self.client.email} - {self.service.title}"


class ClientPreferences(models.Model):
    """
    Store client preferences for service search and filtering.
    """
    client = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences"
    )
    
    # Search preferences
    default_search_radius = models.PositiveIntegerField(
        default=50,
        help_text="Default search radius in kilometers"
    )
    
    # Filter preferences
    preferred_categories = models.ManyToManyField(
        'services.ServiceCategory',
        blank=True,
        related_name="preferred_by_clients"
    )
    
    min_price_filter = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    max_price_filter = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Display preferences
    items_per_page = models.PositiveIntegerField(default=12)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Client Preferences"
        verbose_name_plural = "Client Preferences"
    
    def __str__(self) -> str:
        return f"Preferences for {self.client.email}"


