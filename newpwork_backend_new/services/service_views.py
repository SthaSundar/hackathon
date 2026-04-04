from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.text import slugify
from django.db import models
from .service_models import Service
from .service_serializers import ServiceSerializer
from accounts.models import UserRole


@api_view(["GET"]) 
@permission_classes([AllowAny])
def list_services(request):
    """Public list of active services, optionally filtered by category or search.
    Services are prioritized: rating first, then certificates/degrees."""
    from bookings.models import Booking
    from django.db.models import Avg, Case, When, IntegerField
    from .category_models import ServiceCategory
    
    queryset = Service.objects.filter(is_active=True)
    category = request.query_params.get("category")
    search = request.query_params.get("q")
    
    if category:
        queryset = queryset.filter(category__slug=category)
    if search:
        queryset = queryset.filter(title__icontains=search)
    
    # Annotate with priority: rating is primary, then certificates/degrees
    queryset = queryset.annotate(
        avg_rating=Avg(
            Case(
                When(
                    bookings__status='completed',
                    bookings__rating__isnull=False,
                    then='bookings__rating'
                ),
                default=None,
                output_field=models.FloatField()
            )
        ),
        has_certificates_or_degrees=Case(
            When(certificates__isnull=False, certificates__gt='', then=1),
            When(degrees__isnull=False, degrees__gt='', then=1),
            default=0,
            output_field=IntegerField()
        )
    ).order_by(
        '-avg_rating',  # Higher rating first
        '-has_certificates_or_degrees',  # Has certs/degrees second
        '-created_at'  # Newest last
    )
    
    serializer = ServiceSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["POST"]) 
@permission_classes([IsAuthenticated])
def create_service(request):
    """Provider-only create service. Provider is set from request.user."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if user is authenticated
    if not request.user or not request.user.is_authenticated:
        logger.warning(f"Unauthenticated request to create_service from {request.META.get('REMOTE_ADDR')}")
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    
    user = request.user
    user_role = getattr(user, "role", None)
    logger.info(f"create_service called by user: {user.email}, role: {user_role}")
    
    if user_role != UserRole.PROVIDER:
        logger.warning(f"User {user.email} with role {user_role} tried to create service. Required: {UserRole.PROVIDER}")
        return Response({
            "detail": "Only providers can create services.",
            "user_role": user_role,
            "required_role": UserRole.PROVIDER,
            "user_email": user.email
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if provider has verified KYC
    has_kyc = hasattr(user, 'kyc_verification')
    kyc_verified = has_kyc and user.kyc_verification.is_verified
    kyc_status = user.kyc_verification.status if has_kyc else "not_submitted"
    
    logger.info(f"User {user.email} KYC check: has_kyc={has_kyc}, verified={kyc_verified}, status={kyc_status}")
    
    if not kyc_verified:
        logger.warning(f"User {user.email} tried to create service but KYC not verified. Status: {kyc_status}")
        return Response({
            "detail": "KYC verification required to post services. Please complete your KYC verification first.",
            "kyc_required": True,
            "kyc_status": kyc_status,
            "user_email": user.email
        }, status=status.HTTP_403_FORBIDDEN)
    data = request.data.copy()
    
    # Log received data for debugging
    logger.info(f"Received data keys: {list(data.keys())}")
    logger.info(f"Category value: {data.get('category')}, Type: {type(data.get('category'))}")
    logger.info(f"Title: {data.get('title')}")
    logger.info(f"Base price: {data.get('base_price')}")
    
    # Handle category - it might come as string, need to convert to int
    if 'category' in data:
        try:
            category_value = data.get('category')
            if isinstance(category_value, str):
                # Try to convert string to int
                category_value = int(category_value)
            data['category'] = category_value
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid category value: {data.get('category')}, error: {e}")
            return Response({
                "detail": "Invalid category. Please select a valid category.",
                "category_error": str(e),
                "received_category": str(data.get('category'))
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle base_price - ensure it's a valid decimal
    if 'base_price' in data:
        try:
            base_price_value = data.get('base_price')
            if isinstance(base_price_value, str):
                # Convert string to float then to Decimal-compatible format
                base_price_value = float(base_price_value)
            data['base_price'] = str(base_price_value)  # Convert to string for DecimalField
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid base_price value: {data.get('base_price')}, error: {e}")
            return Response({
                "detail": "Invalid price. Please enter a valid number.",
                "price_error": str(e),
                "received_price": str(data.get('base_price'))
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate slug if not provided
    if not data.get("slug") and data.get("title"):
        data["slug"] = slugify(data["title"])[:175]
    
    serializer = ServiceSerializer(data=data)
    if serializer.is_valid():
        serializer.save(provider=user, is_active=True)
        logger.info(f"Service created successfully for user {user.email}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    # Log validation errors
    logger.error(f"Serializer validation failed for user {user.email}: {serializer.errors}")
    return Response({
        "detail": "Validation failed. Please check the form fields.",
        "errors": serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"]) 
@permission_classes([IsAuthenticated])
def my_services(request):
    """List services for the logged-in provider."""
    # Check if user is authenticated
    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    
    user = request.user
    if getattr(user, "role", None) != UserRole.PROVIDER:
        return Response({
            "detail": "Only providers can view their services.",
            "user_role": getattr(user, "role", None),
            "required_role": UserRole.PROVIDER
        }, status=status.HTTP_403_FORBIDDEN)
    queryset = Service.objects.filter(provider=user)
    serializer = ServiceSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["PATCH", "PUT"]) 
@permission_classes([IsAuthenticated])
def update_service(request, service_id: int):
    """Provider-only update for own service."""
    user = request.user
    try:
        service = Service.objects.get(id=service_id)
    except Service.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if getattr(user, "role", None) != UserRole.PROVIDER or service.provider_id != user.id:
        return Response({"detail": "You cannot modify this service."}, status=status.HTTP_403_FORBIDDEN)
    partial = request.method == "PATCH"
    serializer = ServiceSerializer(service, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([AllowAny])
def service_detail(request, service_id: int):
    """Public service detail with reviews."""
    try:
        service = Service.objects.get(id=service_id, is_active=True)
    except Service.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    serializer = ServiceSerializer(service)
    return Response(serializer.data)


@api_view(["DELETE"]) 
@permission_classes([IsAuthenticated])
def delete_service(request, service_id: int):
    """Provider-only delete for own service."""
    user = request.user
    try:
        service = Service.objects.get(id=service_id)
    except Service.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if getattr(user, "role", None) != UserRole.PROVIDER or service.provider_id != user.id:
        return Response({"detail": "You cannot delete this service."}, status=status.HTTP_403_FORBIDDEN)
    service.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


