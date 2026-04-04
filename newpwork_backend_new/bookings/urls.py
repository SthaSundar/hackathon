from django.urls import path
from .views import create_booking, my_bookings, update_booking_status, rate_booking, service_booked_slots, service_available_slots, provider_orders, service_available_slots_public
from .payment_views import initiate_payment, verify_payment, payment_status, provider_earnings, admin_revenue

urlpatterns = [
    path("create/", create_booking, name="create_booking"),
    path("mine/", my_bookings, name="my_bookings"),
    path("<int:booking_id>/status/", update_booking_status, name="update_booking_status"),
    path("<int:booking_id>/rate/", rate_booking, name="rate_booking"),
    path("service/<int:service_id>/booked-slots/", service_booked_slots, name="service_booked_slots"),
    path("service/<int:service_id>/available-slots/", service_available_slots, name="service_available_slots"),
    path("service/<int:service_id>/available-slots/public/", service_available_slots_public, name="service_available_slots_public"),
    path("provider/orders/", provider_orders, name="provider_orders"),
    # Payment endpoints
    path("<int:booking_id>/payment/initiate/", initiate_payment, name="initiate_payment"),
    path("payment/<int:payment_id>/verify/", verify_payment, name="verify_payment"),
    path("<int:booking_id>/payment/status/", payment_status, name="payment_status"),
    path("provider/earnings/", provider_earnings, name="provider_earnings"),
    # Legacy alias to match existing frontend call
    path("provider-earnings/", provider_earnings, name="provider_earnings_legacy"),
    path("admin/revenue/", admin_revenue, name="admin_revenue"),
]
