from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from accounts.models import UserRole
from .models import ClientProfile, ClientFavorite, ClientPreferences
from .serializers import (
    ClientProfileSerializer,
    ClientFavoriteSerializer,
    ClientPreferencesSerializer,
)


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def client_profile(request):
    """Get or update client profile. Only accessible by customers."""
    user = request.user
    if getattr(user, "role", None) != UserRole.CUSTOMER:
        return Response(
            {"detail": "Only customers can access client profile."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    profile, created = ClientProfile.objects.get_or_create(user=user)
    
    if request.method == "GET":
        serializer = ClientProfileSerializer(profile)
        return Response(serializer.data)
    
    # PUT or PATCH
    partial = request.method == "PATCH"
    serializer = ClientProfileSerializer(profile, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def favorites(request):
    """List or add favorite services."""
    user = request.user
    if getattr(user, "role", None) != UserRole.CUSTOMER:
        return Response(
            {"detail": "Only customers can manage favorites."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == "GET":
        favorites = ClientFavorite.objects.filter(client=user)
        serializer = ClientFavoriteSerializer(favorites, many=True)
        return Response(serializer.data)
    
    # POST
    serializer = ClientFavoriteSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(client=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_favorite(request, favorite_id: int):
    """Remove a favorite service."""
    user = request.user
    if getattr(user, "role", None) != UserRole.CUSTOMER:
        return Response(
            {"detail": "Only customers can remove favorites."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        favorite = ClientFavorite.objects.get(id=favorite_id, client=user)
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except ClientFavorite.DoesNotExist:
        return Response(
            {"detail": "Favorite not found."},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def preferences(request):
    """Get or update client preferences."""
    user = request.user
    if getattr(user, "role", None) != UserRole.CUSTOMER:
        return Response(
            {"detail": "Only customers can manage preferences."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    prefs, created = ClientPreferences.objects.get_or_create(client=user)
    
    if request.method == "GET":
        serializer = ClientPreferencesSerializer(prefs)
        return Response(serializer.data)
    
    # PUT or PATCH
    partial = request.method == "PATCH"
    serializer = ClientPreferencesSerializer(prefs, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


