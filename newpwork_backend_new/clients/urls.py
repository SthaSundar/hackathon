from django.urls import path
from .views import (
    client_profile,
    favorites,
    remove_favorite,
    preferences,
)

urlpatterns = [
    path("profile/", client_profile, name="client_profile"),
    path("favorites/", favorites, name="favorites"),
    path("favorites/<int:favorite_id>/", remove_favorite, name="remove_favorite"),
    path("preferences/", preferences, name="preferences"),
]


