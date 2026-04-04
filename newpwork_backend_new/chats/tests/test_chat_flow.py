from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.utils import timezone
from decimal import Decimal
from accounts.models import User, UserRole
from services.service_models import Service
from services.category_models import ServiceCategory
from bookings.models import Booking
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import timedelta
from chats.models import ChatThread


class ChatFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(
            name="Chat Category",
            slug="chat-category",
            description="Test",
        )
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
        self.admin = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="pass123",
            role=UserRole.ADMIN,
        )
        self.service = Service.objects.create(
            provider=self.provider,
            category=self.category,
            title="Consultation",
            slug="consultation",
            description="Pre-booking inquiry allowed",
            base_price=Decimal("150.00"),
            pricing_type="fixed",
            location="KT",
            certificates="",
            degrees="",
            is_active=True,
        )

    def test_customer_can_start_inquiry_chat(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("start_inquiry_thread", kwargs={"service_id": self.service.id})
        resp = self.client.post(url, {}, format="json")
        self.assertIn(resp.status_code, [200, 201])
        self.assertEqual(resp.data["thread_type"], "inquiry")
        self.assertEqual(resp.data["status"], "active")
        self.assertIsNotNone(resp.data["expires_at"])

    def test_provider_cannot_start_inquiry_chat_on_own_service(self):
        self.client.force_authenticate(user=self.provider)
        url = reverse("start_inquiry_thread", kwargs={"service_id": self.service.id})
        resp = self.client.post(url, {}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_inquiry_chat_blocks_links_and_files(self):
        # Start inquiry
        self.client.force_authenticate(user=self.customer)
        start_url = reverse("start_inquiry_thread", kwargs={"service_id": self.service.id})
        resp = self.client.post(start_url, {}, format="json")
        self.assertIn(resp.status_code, [200, 201])
        thread_id = resp.data["id"]
        # Block external link
        msg_url = reverse("post_message", kwargs={"thread_id": thread_id})
        resp2 = self.client.post(msg_url, {"content": "contact me at https://example.com"}, format="multipart")
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("content", resp2.data)
        # Block file upload in inquiry
        png = SimpleUploadedFile("a.png", b"\x89PNG\r\n", content_type="image/png")
        resp3 = self.client.post(msg_url, {"content": "image", "file": png}, format="multipart")
        self.assertEqual(resp3.status_code, 400)
        self.assertIn("file", resp3.data)
        # Enforce per-user 10 message limit
        for i in range(10):
            ok = self.client.post(msg_url, {"content": f"msg {i}"}, format="multipart")
            self.assertEqual(ok.status_code, 201)
        limit = self.client.post(msg_url, {"content": "msg 11"}, format="multipart")
        self.assertEqual(limit.status_code, 400)
        self.assertIn("limit", limit.data)

    def _confirm_booking_and_get_chat(self):
        # Create a booking then confirm it to auto-create booking chat
        self.client.force_authenticate(user=self.customer)
        book_url = reverse("create_booking")
        future = (timezone.now() + timedelta(hours=3)).isoformat()
        resp = self.client.post(book_url, {"service": self.service.id, "scheduled_for": future}, format="json")
        self.assertEqual(resp.status_code, 201)
        booking_id = resp.data["id"]
        # Provider confirms
        self.client.force_authenticate(user=self.provider)
        upd_url = reverse("update_booking_status", kwargs={"booking_id": booking_id})
        resp2 = self.client.patch(upd_url, {"status": Booking.Status.CONFIRMED}, format="json")
        self.assertEqual(resp2.status_code, 200)
        # Serializer should expose chat_thread_id
        self.assertIsNotNone(resp2.data.get("chat_thread_id"))
        return resp2.data["chat_thread_id"]

    def test_booking_chat_allows_image_and_pdf_under_limit(self):
        thread_id = self._confirm_booking_and_get_chat()
        self.client.force_authenticate(user=self.customer)
        msg_url = reverse("post_message", kwargs={"thread_id": thread_id})
        # PNG image
        png = SimpleUploadedFile("small.png", b"\x89PNG\r\n\x00" * 100, content_type="image/png")
        resp_img = self.client.post(msg_url, {"content": "see image", "file": png}, format="multipart")
        self.assertEqual(resp_img.status_code, 201)
        # PDF document
        pdf_bytes = b"%PDF-1.4\n%" + b"0" * (1024)  # small
        pdf = SimpleUploadedFile("a.pdf", pdf_bytes, content_type="application/pdf")
        resp_pdf = self.client.post(msg_url, {"content": "see doc", "file": pdf}, format="multipart")
        self.assertEqual(resp_pdf.status_code, 201)

    def test_booking_chat_rejects_large_file(self):
        thread_id = self._confirm_booking_and_get_chat()
        self.client.force_authenticate(user=self.customer)
        msg_url = reverse("post_message", kwargs={"thread_id": thread_id})
        # Create >5MB file
        big = SimpleUploadedFile("big.png", b"\x00" * (5 * 1024 * 1024 + 100), content_type="image/png")
        resp_big = self.client.post(msg_url, {"content": "big", "file": big}, format="multipart")
        self.assertEqual(resp_big.status_code, 400)
        self.assertIn("file", resp_big.data)

    def test_admin_access_logs_reason_and_type(self):
        thread_id = self._confirm_booking_and_get_chat()
        # Non-admin cannot access
        self.client.force_authenticate(user=self.customer)
        admin_url = reverse("admin_access_thread", kwargs={"thread_id": thread_id})
        resp_forbidden = self.client.post(admin_url, {"access_type": "dispute", "reason": "review"}, format="json")
        self.assertEqual(resp_forbidden.status_code, 403)
        # Admin must provide reason
        self.client.force_authenticate(user=self.admin)
        resp_bad = self.client.post(admin_url, {"access_type": "dispute", "reason": ""}, format="json")
        self.assertEqual(resp_bad.status_code, 400)
        # Admin ok
        resp_ok = self.client.post(admin_url, {"access_type": "dispute", "reason": "Payment issue"}, format="json")
        self.assertEqual(resp_ok.status_code, 200)
        self.assertIn("thread", resp_ok.data)

    def test_get_thread_requires_participant(self):
        # Create inquiry and attempt access by unrelated user
        self.client.force_authenticate(user=self.customer)
        start = self.client.post(reverse("start_inquiry_thread", kwargs={"service_id": self.service.id}), {}, format="json")
        t_id = start.data["id"]
        other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="pass123",
            role=UserRole.CUSTOMER,
        )
        self.client.force_authenticate(user=other)
        get_url = reverse("get_thread", kwargs={"thread_id": t_id})
        resp = self.client.get(get_url)
        self.assertEqual(resp.status_code, 403)

    def test_provider_inquiries_list_and_unread_counts(self):
        # Customer starts an inquiry and posts messages
        self.client.force_authenticate(user=self.customer)
        start_url = reverse("start_inquiry_thread", kwargs={"service_id": self.service.id})
        resp = self.client.post(start_url, {}, format="json")
        self.assertIn(resp.status_code, [200, 201])
        thread_id = resp.data["id"]
        msg_url = reverse("post_message", kwargs={"thread_id": thread_id})
        ok1 = self.client.post(msg_url, {"content": "hello"}, format="multipart")
        self.assertEqual(ok1.status_code, 201)
        ok2 = self.client.post(msg_url, {"content": "how are you?"}, format="multipart")
        self.assertEqual(ok2.status_code, 201)

        # Provider views inquiries; should see unread > 0
        self.client.force_authenticate(user=self.provider)
        inbox_url = reverse("provider_inquiries")
        inbox = self.client.get(inbox_url)
        self.assertEqual(inbox.status_code, 200)
        data = inbox.json()
        # Find our thread entry
        entry = next((t for t in data if t.get("id") == thread_id), None)
        self.assertIsNotNone(entry)
        self.assertGreaterEqual(entry.get("unread_count", 0), 2)
        self.assertEqual(entry.get("service_title"), "Consultation")
        self.assertEqual(entry.get("client_email"), self.customer.email)
        self.assertIsNotNone(entry.get("expires_in_seconds"))

        # Provider opens thread; unread should become 0 next time
        get_url = reverse("get_thread", kwargs={"thread_id": thread_id})
        opened = self.client.get(get_url)
        self.assertEqual(opened.status_code, 200)
        inbox2 = self.client.get(inbox_url)
        self.assertEqual(inbox2.status_code, 200)
        data2 = inbox2.json()
        entry2 = next((t for t in data2 if t.get("id") == thread_id), None)
        self.assertIsNotNone(entry2)
        self.assertEqual(entry2.get("unread_count", 0), 0)
