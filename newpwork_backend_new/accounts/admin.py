from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, KYCVerification


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "display_name", "phone_number")
    fieldsets = (
        (None, {"fields": ("username", "password")} ),
        ("Personal info", {"fields": ("display_name", "first_name", "last_name", "email", "phone_number", "avatar_url", "bio")} ),
        ("Marketplace", {"fields": ("role", "is_email_verified")} ),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")} ),
        ("Important dates", {"fields": ("last_login", "date_joined")} ),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "password1", "password2", "role", "is_staff", "is_superuser"),
        }),
    )
    ordering = ("-date_joined",)


@admin.register(KYCVerification)
class KYCVerificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'full_name', 'email', 'phone_number', 'status', 'created_at', 'verified_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'full_name', 'email', 'phone_number']
    readonly_fields = ['created_at', 'updated_at', 'verified_at', 'verified_by']
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'full_name', 'email', 'phone_number', 'address')
        }),
        ('Documents', {
            'fields': ('photo', 'citizenship', 'driving_license', 'passport')
        }),
        ('Verification Status', {
            'fields': ('status', 'admin_notes', 'verified_by', 'verified_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # New object
            obj.verified_by = None
        elif obj.status == KYCVerification.Status.APPROVED and not obj.verified_by:
            obj.verified_by = request.user
        super().save_model(request, obj, form, change)
