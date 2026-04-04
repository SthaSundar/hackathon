from rest_framework import serializers
from .category_models import ServiceCategory
from .service_models import Service


class ServiceCategorySerializer(serializers.ModelSerializer):
    service_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = ["id", "name", "slug", "description", "service_count"]

    def get_service_count(self, obj):
        return Service.objects.filter(category=obj, is_active=True).count()


