from django.contrib import admin
from .category_models import ServiceCategory
from .service_models import Service


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "provider", "category", "pricing_type", "base_price", "is_active", "created_at")
    list_filter = ("category", "pricing_type", "is_active")
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}
