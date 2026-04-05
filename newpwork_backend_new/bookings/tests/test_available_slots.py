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


class AvailableSlotsTests(TestCase):
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
            title="Standard Floral Maintenance",
            description="Routine plant care services.",
            base_price=Decimal("1500.00"),
            pricing_type=Service.PricingType.FIXED,
            is_active=True,
        )

    def test_available_slots_excludes_booked_and_past(self):
        self.client.force_authenticate(user=self.customer)
        date = (timezone.now() + timedelta(days=1)).date().isoformat()
        # Book a specific slot
        booked_dt = timezone.now() + timedelta(days=1)
        booked_dt = booked_dt.replace(hour=11, minute=0, second=0, microsecond=0)
        Booking.objects.create(
            service=self.service,
            customer=self.customer,
            scheduled_for=booked_dt,
            status=Booking.Status.CONFIRMED
        )
        url = reverse("service_available_slots", args=[self.service.id])
        resp = self.client.get(url, {"date": date, "interval": 60, "start_hour": 9, "end_hour": 12})
        self.assertEqual(resp.status_code, 200)
        slots = resp.data["available_slots"]
        booked_slots = resp.data["booked_slots"]
        # 9:00, 10:00, 11:00, 12:00 candidates, 11:00 booked -> not in available
        self.assertIn(booked_dt.isoformat(), booked_slots)
        self.assertNotIn(booked_dt.isoformat(), slots)
