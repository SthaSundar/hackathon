from rest_framework import serializers
from .models import Booking, Payment, SeasonalEvent


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
    chat_unread_count = serializers.SerializerMethodField()
    seasonal_event_name = serializers.CharField(source="seasonal_event.name", read_only=True)
    event_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

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
            "delivery_phase",
            "scheduled_for",
            "notes",
            "company_name",
            "pan",
            "rating",
            "review",
            "confirmed_at",
            "provider_responded_at",
            "customer_cancelled_at",
            "base_price",
            "total_amount",
            "transaction_type",
            "provider_payout_amount",
            "amount_paid",
            "commission_amount",
            "payment_status",
            "payment_completed_at",
            "esewa_transaction_uuid",
            "esewa_ref_id",
            "latest_payment",
            "provider_earnings",
            "chat_thread_id",
            "chat_unread_count",
            "is_prebooking",
            "seasonal_event",
            "seasonal_event_name",
            "event_id",
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
            "delivery_phase",
            "total_amount",
            "transaction_type",
            "provider_payout_amount",
            "esewa_transaction_uuid",
            "esewa_ref_id",
        ]

    def validate(self, attrs):
        eid = attrs.pop("event_id", None)
        is_pb = bool(attrs.get("is_prebooking"))
        if eid is not None and is_pb:
            try:
                attrs["seasonal_event"] = SeasonalEvent.objects.get(pk=eid, is_active=True)
            except SeasonalEvent.DoesNotExist:
                raise serializers.ValidationError({"event_id": "Invalid or inactive seasonal event."})
        ev = attrs.get("seasonal_event")
        if is_pb and not ev:
            raise serializers.ValidationError(
                {"event_id": "Select a seasonal event for pre-booking."}
            )
        return attrs

    def get_latest_payment(self, obj):
        """Get the latest payment for this booking."""
        from .models import Payment
        latest_payment = Payment.objects.filter(booking=obj).order_by('-created_at').first()
        if latest_payment:
            return PaymentSerializer(latest_payment).data
        return None

    def get_provider_earnings(self, obj):
        """Calculate provider earnings after commission."""
        if obj.provider_payout_amount is not None:
            return str(obj.provider_payout_amount)
        if obj.amount_paid and obj.commission_amount:
            return str(obj.amount_paid - obj.commission_amount)
        return None

    def get_chat_unread_count(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request.user, "is_authenticated", False):
            return 0
        try:
            from chats.models import ChatMessage, ChatThread

            thread = (
                ChatThread.objects.filter(thread_type=ChatThread.Type.BOOKING, booking=obj)
                .only("id", "client_id", "provider_id", "client_last_seen", "provider_last_seen")
                .first()
            )
            if not thread:
                return 0
            uid = request.user.id
            if uid == thread.client_id:
                last_seen = thread.client_last_seen
                other_id = thread.provider_id
            elif uid == thread.provider_id:
                last_seen = thread.provider_last_seen
                other_id = thread.client_id
            else:
                return 0
            qs = ChatMessage.objects.filter(thread_id=thread.id, sender_id=other_id)
            if last_seen:
                qs = qs.filter(created_at__gt=last_seen)
            return qs.count()
        except Exception:
            return 0

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
