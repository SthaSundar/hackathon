from django.contrib import admin
from .models import ClientProfile, ClientFavorite, ClientPreferences


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "preferred_language", "total_bookings", "total_spent", "created_at")
    list_filter = ("preferred_language", "email_notifications", "created_at")
    search_fields = ("user__email", "user__display_name", "default_location")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ClientFavorite)
class ClientFavoriteAdmin(admin.ModelAdmin):
    list_display = ("client", "service", "created_at")
    list_filter = ("created_at",)
    search_fields = ("client__email", "service__title")
    readonly_fields = ("created_at",)


@admin.register(ClientPreferences)
class ClientPreferencesAdmin(admin.ModelAdmin):
    list_display = ("client", "default_search_radius", "items_per_page", "updated_at")
    list_filter = ("default_search_radius", "updated_at")
    search_fields = ("client__email",)
    filter_horizontal = ("preferred_categories",)
    readonly_fields = ("created_at", "updated_at")


