from django.urls import path

from . import views

urlpatterns = [
    path("bulk-inquiries/", views.bulk_inquiries_list_create),
    path("bulk-inquiries/<int:pk>/respond/", views.bulk_inquiry_respond),
    path("bulk-inquiries/<int:pk>/close/", views.bulk_inquiry_close),
    path("freshness-reports/pending/", views.admin_list_pending_freshness_reports),
]
