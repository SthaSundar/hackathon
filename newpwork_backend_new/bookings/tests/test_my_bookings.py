from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import User, UserRole
from services.service_models import Service
from services.category_models import ServiceCategory
from bookings.models import Booking
from decimal import Decimal


class MyBookingsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username="cust1",
            email="cust1@example.com",
            password="pass123",
            role=UserRole.CUSTOMER,
        )
        self.provider = User.objects.create_user(
            username="prov1",
            email="prov1@example.com",
            password="pass123",
            role=UserRole.PROVIDER,
        )
        self.category = ServiceCategory.objects.create(
            name="Test Category",
            slug="test-category",
            description="Test",
        )
        self.service_by_provider = Service.objects.create(
            provider=self.provider,
            category=self.category,
            title="Provider Service",
            slug="provider-service",
            description="Test",
            base_price=Decimal("100.00"),
            pricing_type="fixed",
            location="KT",
            certificates="",
            degrees="",
            is_active=True,
        )
        self.service_by_customer = Service.objects.create(
            provider=self.customer,
            category=self.category,
            title="Customer Service",
            slug="customer-service",
            description="Test",
            base_price=Decimal("50.00"),
            pricing_type="fixed",
            location="KT",
            certificates="",
            degrees="",
            is_active=True,
        )
        self.booking_allowed = Booking.objects.create(
            service=self.service_by_provider,
            customer=self.customer,
            status=Booking.Status.PENDING,
        )
        self.booking_excluded = Booking.objects.create(
            service=self.service_by_customer,
            customer=self.customer,
            status=Booking.Status.PENDING,
        )

    def test_customer_my_bookings_excludes_self_provider(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("my_bookings")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        ids = [b["id"] for b in resp.data]
        self.assertIn(self.booking_allowed.id, ids)
        self.assertNotIn(self.booking_excluded.id, ids)

    def test_customer_my_bookings_with_status_filter(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("my_bookings")
        resp = self.client.get(url, {"status": Booking.Status.PENDING})
        self.assertEqual(resp.status_code, 200)
        ids = [b["id"] for b in resp.data]
        self.assertIn(self.booking_allowed.id, ids)
        self.assertNotIn(self.booking_excluded.id, ids)

    def test_provider_my_bookings_lists_bookings_on_their_services(self):
        other_customer = User.objects.create_user(
            username="cust2",
            email="cust2@example.com",
            password="pass123",
            role=UserRole.CUSTOMER,
        )
        Booking.objects.create(
            service=self.service_by_provider,
            customer=other_customer,
            status=Booking.Status.CONFIRMED,
        )
        self.client.force_authenticate(user=self.provider)
        url = reverse("my_bookings")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        service_ids = {b["service"] for b in resp.data}
        self.assertIn(self.service_by_provider.id, service_ids)
