from rest_framework import serializers
from .service_models import Service
from bookings.models import Booking


class ServiceSerializer(serializers.ModelSerializer):
    provider_email = serializers.EmailField(source="provider.email", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)
    provider_verified = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "provider",
            "provider_email",
            "provider_name",
            "provider_verified",
            "category",
            "category_name",
            "title",
            "slug",
            "description",
            "base_price",
            "pricing_type",
            "location",
            "certificates",
            "degrees",
            "is_active",
            "average_rating",
            "total_reviews",
            "reviews",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["provider", "created_at", "updated_at", "is_active"]

    def get_average_rating(self, obj):
        """Calculate average rating from completed bookings with ratings"""
        from django.db.models import Avg
        avg = Booking.objects.filter(
            service=obj,
            status=Booking.Status.COMPLETED,
            rating__isnull=False
        ).aggregate(avg_rating=Avg('rating'))['avg_rating']
        return round(avg, 1) if avg else None

    def get_total_reviews(self, obj):
        """Count total reviews"""
        return Booking.objects.filter(
            service=obj,
            status=Booking.Status.COMPLETED,
            review__isnull=False
        ).exclude(review='').count()

    def get_provider_verified(self, obj):
        """Check if provider has verified KYC"""
        if hasattr(obj.provider, 'kyc_verification'):
            return obj.provider.kyc_verification.is_verified
        return False

    def get_reviews(self, obj):
        """Get recent reviews for this service"""
        reviews = Booking.objects.filter(
            service=obj,
            status=Booking.Status.COMPLETED,
            review__isnull=False
        ).exclude(review='').order_by('-updated_at')[:10]
        return [
            {
                "id": r.id,
                "customer_email": r.customer.email,
                "customer_name": r.customer.display_name or r.customer.username,
                "rating": r.rating,
                "review": r.review,
                "created_at": r.updated_at
            }
            for r in reviews
        ]


