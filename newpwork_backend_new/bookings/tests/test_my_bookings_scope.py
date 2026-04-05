from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.utils import timezone
from decimal import Decimal
from accounts.models import User, UserRole
from services.service_models import Service
from services.category_models import ServiceCategory
from bookings.models import Booking
from datetime import timedelta


class MyBookingsScopeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(
            name="Test Category",
            slug="test-category",
            description="Test",
        )
        self.provider = User.objects.create_user(
            username="prov",
            email="prov@example.com",
            password="pass123",
            role=UserRole.PROVIDER,
        )
        self.customer = User.objects.create_user(
            username="cust",
            email="cust@example.com",
            password="pass123",
            role=UserRole.CUSTOMER,
        )
        self.service = Service.objects.create(
            provider=self.provider,
            title="Office Plant Maintenance",
            description="Regular maintenance of office plants in Kathmandu.",
            base_price=Decimal("5000.00"),
            pricing_type=Service.PricingType.PER_MONTH,
            is_active=True,
        )
        self.booking = Booking.objects.create(
            service=self.service,
            customer=self.customer,
            status=Booking.Status.PENDING,
            scheduled_for=timezone.now() + timedelta(days=1),
        )

    def test_default_scope_is_provider_for_provider(self):
        self.client.force_authenticate(user=self.provider)
        url = reverse("my_bookings")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        # Provider default view should list bookings on their services
        ids = [b["id"] for b in resp.data]
        self.assertIn(self.booking.id, ids)

    def test_scope_provider_lists_bookings_on_provider_services(self):
        self.client.force_authenticate(user=self.provider)
        url = reverse("my_bookings")
        resp = self.client.get(url, {"scope": "provider"})
        self.assertEqual(resp.status_code, 200)
        ids = [b["id"] for b in resp.data]
        self.assertIn(self.booking.id, ids)
