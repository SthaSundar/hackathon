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


class ProviderOrdersTests(TestCase):
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
            category=self.category,
            title="Service",
            slug="service",
            description="Test",
            base_price=Decimal("100.00"),
            pricing_type="fixed",
            location="KT",
            certificates="",
            degrees="",
            is_active=True,
        )
        # Create one pending, one confirmed, one completed
        Booking.objects.create(
            service=self.service,
            customer=self.customer,
            status=Booking.Status.PENDING,
            scheduled_for=timezone.now() + timedelta(days=1),
        )
        Booking.objects.create(
            service=self.service,
            customer=self.customer,
            status=Booking.Status.CONFIRMED,
            scheduled_for=timezone.now() + timedelta(days=2),
        )
        Booking.objects.create(
            service=self.service,
            customer=self.customer,
            status=Booking.Status.COMPLETED,
            scheduled_for=timezone.now() - timedelta(days=1),
        )

    def test_grouped_provider_orders(self):
        self.client.force_authenticate(user=self.provider)
        url = reverse("provider_orders")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("new_requests", resp.data)
        self.assertIn("active", resp.data)
        self.assertIn("completed", resp.data)
        self.assertEqual(resp.data["counts"]["new_requests"], 1)
        self.assertEqual(resp.data["counts"]["active"], 1)
        self.assertEqual(resp.data["counts"]["completed"], 1)
