from django.db.models import Avg, Q
from rest_framework import serializers
from accounts.response_time import format_response_time_label
from .service_models import Service
from bookings.models import Booking


class ServiceSerializer(serializers.ModelSerializer):
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)
    provider_email = serializers.EmailField(source="provider.email", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)
    provider_photo_url = serializers.SerializerMethodField()
    provider_address = serializers.SerializerMethodField()
    provider_phone = serializers.SerializerMethodField()
    provider_verified = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    provider_freshness_guarantee = serializers.SerializerMethodField()
    provider_avg_response_hours = serializers.SerializerMethodField()
    provider_response_label = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "provider",
            "provider_id",
            "provider_email",
            "provider_name",
            "provider_photo_url",
            "provider_address",
            "provider_phone",
            "provider_verified",
            "category",
            "category_name",
            "title",
            "slug",
            "description",
            "base_price",
            "pricing_type",
            "is_active",
            "average_rating",
            "total_reviews",
            "reviews",
            "provider_freshness_guarantee",
            "provider_avg_response_hours",
            "provider_response_label",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["provider", "created_at", "updated_at", "is_active"]

    def get_average_rating(self, obj):
        """Calculate average rating from completed bookings with ratings"""
        avg = Booking.objects.filter(
            service=obj,
            status=Booking.Status.COMPLETED,
            rating__isnull=False
        ).aggregate(avg_rating=Avg('rating'))['avg_rating']
        return round(avg, 1) if avg else None

    def get_total_reviews(self, obj):
        """Count ratings and/or written reviews"""
        return (
            Booking.objects.filter(service=obj, status=Booking.Status.COMPLETED)
            .filter(Q(rating__isnull=False) | (~Q(review="") & Q(review__isnull=False)))
            .count()
        )

    def get_provider_photo_url(self, obj):
        p = obj.provider
        kyc = getattr(p, "kyc_verification", None)
        if kyc and kyc.photo:
            request = self.context.get("request")
            url = kyc.photo.url
            if request:
                return request.build_absolute_uri(url)
            return url
        if getattr(p, "avatar_url", None):
            return p.avatar_url
        return None

    def get_provider_address(self, obj):
        kyc = getattr(obj.provider, "kyc_verification", None)
        if kyc and kyc.address:
            return kyc.address
        return ""

    def get_provider_phone(self, obj):
        kyc = getattr(obj.provider, "kyc_verification", None)
        if kyc and kyc.phone_number:
            return kyc.phone_number
        return obj.provider.phone_number or ""

    def get_provider_verified(self, obj):
        """Check if provider has verified KYC"""
        if hasattr(obj.provider, 'kyc_verification'):
            return obj.provider.kyc_verification.is_verified
        return False

    def get_provider_freshness_guarantee(self, obj):
        p = obj.provider
        return bool(getattr(p, "freshness_guarantee", False))

    def get_provider_avg_response_hours(self, obj):
        return getattr(obj.provider, "avg_response_hours", None)

    def get_provider_response_label(self, obj):
        return format_response_time_label(getattr(obj.provider, "avg_response_hours", None))

    def get_reviews(self, obj):
        """Recent ratings/reviews from completed bookings"""
        reviews = (
            Booking.objects.filter(service=obj, status=Booking.Status.COMPLETED)
            .filter(Q(rating__isnull=False) | (~Q(review="") & Q(review__isnull=False)))
            .select_related("customer")
            .order_by("-updated_at")[:10]
        )
        return [
            {
                "id": r.id,
                "customer_email": r.customer.email,
                "customer_name": r.customer.display_name or r.customer.username,
                "rating": r.rating,
                "review": r.review or "",
                "created_at": r.updated_at,
            }
            for r in reviews
        ]


