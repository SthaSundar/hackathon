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


def _premium_profile(user):
    user.display_name = user.display_name or "Named User"
    user.phone_number = user.phone_number or "9841234567"
    user.address = (user.address or "").strip() or "Kathmandu, Nepal — full street address for testing."
    user.phone_verified = True
    user.is_email_verified = True
    user.save()


class CreateBookingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        ServiceCategory.objects.create(
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
        _premium_profile(self.customer)

        self.provider_a = User.objects.create_user(
            username="provA",
            email="provA@example.com",
            password="pass123",
            role=UserRole.PROVIDER,
        )
        _premium_profile(self.provider_a)

        self.provider_b = User.objects.create_user(
            username="provB",
            email="provB@example.com",
            password="pass123",
            role=UserRole.PROVIDER,
        )
        _premium_profile(self.provider_b)

        self.service_b = Service.objects.create(
            provider=self.provider_b,
            title="Professional Wedding Decoration",
            description="Complete floral decoration for wedding venues in Kathmandu.",
            base_price=Decimal("15000.00"),
            pricing_type=Service.PricingType.NEGOTIABLE,
            is_active=True,
        )
        self.service_cheap = Service.objects.create(
            provider=self.provider_b,
            title="Small Bouquet",
            description="Small bouquet under 5k tier.",
            base_price=Decimal("4000.00"),
            pricing_type=Service.PricingType.FIXED,
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
        resp1 = self.client.post(url, {"service": self.service_b.id}, format="json")
        self.assertEqual(resp1.status_code, 400)
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        resp2 = self.client.post(url, {"service": self.service_b.id, "scheduled_for": past}, format="json")
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("must be in the future", resp2.data["detail"])

    def test_prevent_double_booking_same_time(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("create_booking")
        slot = timezone.now() + timedelta(hours=3)
        resp = self.client.post(url, {"service": self.service_b.id, "scheduled_for": slot.isoformat()}, format="json")
        self.assertEqual(resp.status_code, 201)
        self.client.force_authenticate(user=self.provider_a)
        resp2 = self.client.post(url, {"service": self.service_b.id, "scheduled_for": slot.isoformat()}, format="json")
        self.assertEqual(resp2.status_code, 409)
        self.assertIn("already taken", resp2.data["detail"])

    def test_premium_booking_requires_complete_profile(self):
        u = User.objects.create_user(
            username="bare",
            email="bare@example.com",
            password="pass123",
            role=UserRole.CUSTOMER,
        )
        u.is_email_verified = True
        u.phone_verified = False
        u.save()
        self.client.force_authenticate(user=u)
        url = reverse("create_booking")
        future = (timezone.now() + timedelta(hours=5)).isoformat()
        resp = self.client.post(url, {"service": self.service_b.id, "scheduled_for": future}, format="json")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get("code"), "profile_incomplete")

    def test_budget_tier_blocks_without_phone_email_google(self):
        u = User.objects.create_user(
            username="nobudget",
            email="nobudget@example.com",
            password="pass123",
            role=UserRole.CUSTOMER,
        )
        u.is_email_verified = False
        u.phone_verified = False
        u.google_id = ""
        u.save()
        self.client.force_authenticate(user=u)
        url = reverse("create_booking")
        future = (timezone.now() + timedelta(hours=5)).isoformat()
        resp = self.client.post(url, {"service": self.service_cheap.id, "scheduled_for": future}, format="json")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get("code"), "budget_tier_requirements")

    def test_optional_company_pan_on_booking(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("create_booking")
        future = (timezone.now() + timedelta(hours=6)).isoformat()
        resp = self.client.post(
            url,
            {
                "service": self.service_b.id,
                "scheduled_for": future,
                "company_name": "Floriculture Pvt Ltd",
                "pan": "123456789",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        b = Booking.objects.get(id=resp.data["id"])
        self.assertEqual(b.company_name, "Floriculture Pvt Ltd")
        self.assertEqual(b.pan, "123456789")
