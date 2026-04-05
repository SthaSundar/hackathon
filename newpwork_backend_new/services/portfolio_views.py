from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .portfolio_models import PortfolioItem
from .portfolio_serializers import PortfolioItemSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def list_portfolio(request, provider_id):
    """Fetch all portfolio items for a specific provider (public)"""
    items = PortfolioItem.objects.filter(provider_id=provider_id)
    serializer = PortfolioItemSerializer(items, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_portfolio(request):
    """Fetch portfolio items for the logged-in provider"""
    from accounts.models import UserRole
    if request.user.role != UserRole.PROVIDER:
        return Response({"detail": "Only providers have portfolios."}, status=status.HTTP_403_FORBIDDEN)
    
    items = PortfolioItem.objects.filter(provider=request.user)
    serializer = PortfolioItemSerializer(items, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def add_portfolio_item(request):
    """Upload a portfolio item (provider only)"""
    from accounts.models import UserRole
    if request.user.role != UserRole.PROVIDER:
        return Response({"detail": "Only providers can manage portfolio."}, status=status.HTTP_403_FORBIDDEN)
    
    # Check limit of 12 items
    if PortfolioItem.objects.filter(provider=request.user).count() >= 12:
        return Response({"detail": "Maximum 12 portfolio items allowed."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = PortfolioItemSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(provider=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def portfolio_item_detail(request, item_id):
    """Update or delete own portfolio item."""
    try:
        item = PortfolioItem.objects.get(id=item_id, provider=request.user)
    except PortfolioItem.DoesNotExist:
        return Response({"detail": "Portfolio item not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = PortfolioItemSerializer(item, data=request.data, partial=partial, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
