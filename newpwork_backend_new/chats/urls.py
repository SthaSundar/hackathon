from django.urls import path
from .views import start_inquiry_thread, post_message, get_thread, admin_access_thread, lock_thread, provider_inquiries

urlpatterns = [
    path("inquiry/<int:service_id>/start/", start_inquiry_thread, name="start_inquiry_thread"),
    path("thread/<int:thread_id>/", get_thread, name="get_thread"),
    path("thread/<int:thread_id>/message/", post_message, name="post_message"),
    path("thread/<int:thread_id>/admin/access/", admin_access_thread, name="admin_access_thread"),
    path("thread/<int:thread_id>/lock/", lock_thread, name="lock_thread"),
    path("inquiries/provider/", provider_inquiries, name="provider_inquiries"),
]
