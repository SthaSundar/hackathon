from django.db import models
from django.conf import settings
from .category_models import ServiceCategory


class Service(models.Model):
    class PricingType(models.TextChoices):
        FIXED = "fixed", "Fixed"
        NEGOTIABLE = "negotiable", "Negotiable"
        PER_MONTH = "per_month", "Per Month"

    provider = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="service_listings")
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name="services", null=True, blank=True)
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, null=True, blank=True)
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pricing_type = models.CharField(max_length=20, choices=PricingType.choices, default=PricingType.NEGOTIABLE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title


