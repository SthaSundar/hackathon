# Import serializers from separated files for backward compatibility
from .category_serializers import ServiceCategorySerializer
from .service_serializers import ServiceSerializer

__all__ = ['ServiceCategorySerializer', 'ServiceSerializer']
