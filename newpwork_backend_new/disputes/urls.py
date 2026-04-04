from django.urls import path
from .views import create_dispute, list_disputes, close_dispute, booking_disputes

urlpatterns = [
    path("create/<int:booking_id>/", create_dispute, name="create_dispute"),
    path("list/", list_disputes, name="list_disputes"),
    path("<int:dispute_id>/close/", close_dispute, name="close_dispute"),
    path("booking/<int:booking_id>/", booking_disputes, name="booking_disputes"),
]
