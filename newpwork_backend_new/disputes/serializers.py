from rest_framework import serializers
from .models import Dispute
from bookings.serializers import BookingSerializer
from chats.serializers import ChatThreadSerializer

class DisputeSerializer(serializers.ModelSerializer):
    booking = BookingSerializer(read_only=True)
    thread = ChatThreadSerializer(read_only=True)
    creator_email = serializers.EmailField(source="creator.email", read_only=True)
    creator_name = serializers.CharField(source="creator.display_name", read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "booking",
            "thread",
            "creator",
            "creator_email",
            "creator_name",
            "category",
            "description",
            "attachment",
            "status",
            "resolution_notes",
            "created_at",
            "closed_at",
        ]
        read_only_fields = ["creator", "status", "created_at", "closed_at"]
