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


class CreateBookingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(
            name="Test Category",
            slug="test-category",
            description="Test",
        )
        self.customer = User.objects.create_user(
            username="cust",
            email="cust@example.com",
            password="pass123",
            role=UserRole.CUSTOMER,
        )
        self.provider_a = User.objects.create_user(
            username="provA",
            email="provA@example.com",
            password="pass123",
            role=UserRole.PROVIDER,
        )
        self.provider_b = User.objects.create_user(
            username="provB",
            email="provB@example.com",
            password="pass123",
            role=UserRole.PROVIDER,
        )
        self.service_b = Service.objects.create(
            provider=self.provider_b,
            category=self.category,
            title="Service B",
            slug="service-b",
            description="Test",
            base_price=Decimal("100.00"),
            pricing_type="fixed",
            location="KT",
            certificates="",
            degrees="",
            is_active=True,
        )

    def test_provider_can_book_other_providers_service(self):
        self.client.force_authenticate(user=self.provider_a)
        url = reverse("create_booking")
        future = (timezone.now() + timedelta(hours=2)).isoformat()
        resp = self.client.post(url, {"service": self.service_b.id, "scheduled_for": future, "notes": ""}, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["customer"], self.provider_a.id)
        self.assertEqual(resp.data["service"], self.service_b.id)
        self.assertEqual(resp.data["status"], Booking.Status.PENDING)

    def test_provider_cannot_book_own_service(self):
        self.client.force_authenticate(user=self.provider_b)
        url = reverse("create_booking")
        future = (timezone.now() + timedelta(hours=2)).isoformat()
        resp = self.client.post(url, {"service": self.service_b.id, "scheduled_for": future}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot book your own service", resp.data["detail"])

    def test_scheduled_time_required_and_must_be_future(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("create_booking")
        # missing scheduled_for
        resp1 = self.client.post(url, {"service": self.service_b.id}, format="json")
        self.assertEqual(resp1.status_code, 400)
        # past scheduled_for
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        resp2 = self.client.post(url, {"service": self.service_b.id, "scheduled_for": past}, format="json")
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("must be in the future", resp2.data["detail"])

    def test_prevent_double_booking_same_time(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("create_booking")
        slot = timezone.now() + timedelta(hours=3)
        # First booking ok
        resp = self.client.post(url, {"service": self.service_b.id, "scheduled_for": slot.isoformat()}, format="json")
        self.assertEqual(resp.status_code, 201)
        # Second booking for same time should conflict
        self.client.force_authenticate(user=self.provider_a)
        resp2 = self.client.post(url, {"service": self.service_b.id, "scheduled_for": slot.isoformat()}, format="json")
        self.assertEqual(resp2.status_code, 409)
        self.assertIn("already taken", resp2.data["detail"])

