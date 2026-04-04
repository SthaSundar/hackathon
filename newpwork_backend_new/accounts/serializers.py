from rest_framework import serializers
from .models import User, KYCVerification, Notification


class UserSerializer(serializers.ModelSerializer):
    is_kyc_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "display_name",
            "phone_number",
            "role",
            "avatar_url",
            "bio",
            "is_kyc_verified",
        ]
        read_only_fields = ["id", "username", "email", "role"]

    def get_is_kyc_verified(self, obj):
        """Check if user has verified KYC"""
        if hasattr(obj, 'kyc_verification'):
            return obj.kyc_verification.is_verified
        return False


class KYCVerificationSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    citizenship_url = serializers.SerializerMethodField()
    driving_license_url = serializers.SerializerMethodField()
    passport_url = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_verified = serializers.BooleanField(read_only=True)
    email = serializers.EmailField(required=False)

    class Meta:
        model = KYCVerification
        fields = [
            "id",
            "user",
            "user_email",
            "photo",
            "photo_url",
            "full_name",
            "address",
            "phone_number",
            "email",
            "citizenship",
            "citizenship_url",
            "driving_license",
            "driving_license_url",
            "passport",
            "passport_url",
            "status",
            "status_display",
            "is_verified",
            "admin_notes",
            "verified_at",
            "verified_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "status",
            "admin_notes",
            "verified_at",
            "verified_by",
            "created_at",
            "updated_at",
        ]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def get_citizenship_url(self, obj):
        if obj.citizenship:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.citizenship.url)
            return obj.citizenship.url
        return None

    def get_driving_license_url(self, obj):
        if obj.driving_license:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.driving_license.url)
            return obj.driving_license.url
        return None

    def get_passport_url(self, obj):
        if obj.passport:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.passport.url)
            return obj.passport.url
        return None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "is_read",
            "related_booking_id",
            "related_service_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

