from rest_framework import serializers
from .models import ClientProfile, ClientFavorite, ClientPreferences


class ClientProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.display_name", read_only=True)
    
    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "preferred_language",
            "email_notifications",
            "sms_notifications",
            "push_notifications",
            "default_location",
            "preferred_currency",
            "total_bookings",
            "total_spent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "total_bookings", "total_spent", "created_at", "updated_at"]


class ClientFavoriteSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source="service.title", read_only=True)
    service_slug = serializers.SlugField(source="service.slug", read_only=True)
    
    class Meta:
        model = ClientFavorite
        fields = ["id", "client", "service", "service_title", "service_slug", "created_at"]
        read_only_fields = ["client", "created_at"]


class ClientPreferencesSerializer(serializers.ModelSerializer):
    preferred_categories_names = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientPreferences
        fields = [
            "id",
            "client",
            "default_search_radius",
            "preferred_categories",
            "preferred_categories_names",
            "min_price_filter",
            "max_price_filter",
            "items_per_page",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["client", "created_at", "updated_at"]
    
    def get_preferred_categories_names(self, obj):
        return [cat.name for cat in obj.preferred_categories.all()]


