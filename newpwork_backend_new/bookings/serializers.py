from rest_framework import serializers
from .models import Booking, Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "amount",
            "commission_amount",
            "payment_method",
            "status",
            "transaction_id",
            "created_at",
            "completed_at"
        ]


class BookingSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source="service.title", read_only=True)
    service_description = serializers.CharField(source="service.description", read_only=True)
    provider_id = serializers.IntegerField(source="service.provider_id", read_only=True)
    provider_email = serializers.EmailField(source="service.provider.email", read_only=True)
    provider_name = serializers.CharField(source="service.provider.display_name", read_only=True)
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    base_price = serializers.DecimalField(source="service.base_price", max_digits=10, decimal_places=2, read_only=True)
    latest_payment = serializers.SerializerMethodField()
    provider_earnings = serializers.SerializerMethodField()
    chat_thread_id = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "service",
            "service_title",
            "service_description",
            "provider_id",
            "provider_email",
            "provider_name",
            "customer",
            "customer_email",
            "customer_name",
            "status",
            "scheduled_for",
            "notes",
            "rating",
            "review",
            "confirmed_at",
            "provider_responded_at",
            "customer_cancelled_at",
            "base_price",
            "amount_paid",
            "commission_amount",
            "payment_status",
            "payment_completed_at",
            "latest_payment",
            "provider_earnings",
            "chat_thread_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "customer",
            "confirmed_at",
            "provider_responded_at",
            "customer_cancelled_at",
            "created_at",
            "updated_at",
            "amount_paid",
            "commission_amount",
            "payment_status",
            "payment_completed_at",
        ]

    def get_latest_payment(self, obj):
        """Get the latest payment for this booking."""
        from .models import Payment
        latest_payment = Payment.objects.filter(booking=obj).order_by('-created_at').first()
        if latest_payment:
            return PaymentSerializer(latest_payment).data
        return None

    def get_provider_earnings(self, obj):
        """Calculate provider earnings after commission."""
        if obj.amount_paid and obj.commission_amount:
            return str(obj.amount_paid - obj.commission_amount)
        return None

    def get_chat_thread_id(self, obj):
        """Expose related booking chat thread id if exists."""
        try:
            from chats.models import ChatThread
            thread = ChatThread.objects.filter(
                thread_type=ChatThread.Type.BOOKING,
                booking=obj
            ).only("id").first()
            return thread.id if thread else None
        except Exception:
            return None
