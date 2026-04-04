from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .category_models import ServiceCategory
from .category_serializers import ServiceCategorySerializer
from accounts.models import UserRole


@api_view(["GET"])
@permission_classes([AllowAny])
def list_categories(request):
    """Return all service categories."""
    categories = ServiceCategory.objects.all()
    serializer = ServiceCategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(["POST"]) 
@permission_classes([IsAuthenticated])
def create_category(request):
    """Admin-only: create category"""
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can create categories."}, status=status.HTTP_403_FORBIDDEN)
    serializer = ServiceCategorySerializer(data=request.data)
    if serializer.is_valid():
        obj = serializer.save()
        return Response(ServiceCategorySerializer(obj).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"]) 
@permission_classes([IsAuthenticated])
def update_category(request, category_id: int):
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can update categories."}, status=status.HTTP_403_FORBIDDEN)
    try:
        cat = ServiceCategory.objects.get(id=category_id)
    except ServiceCategory.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    partial = request.method == "PATCH"
    serializer = ServiceCategorySerializer(cat, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"]) 
@permission_classes([IsAuthenticated])
def delete_category(request, category_id: int):
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can delete categories."}, status=status.HTTP_403_FORBIDDEN)
    try:
        cat = ServiceCategory.objects.get(id=category_id)
    except ServiceCategory.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    cat.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


