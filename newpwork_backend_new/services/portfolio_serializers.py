from rest_framework import serializers
from .portfolio_models import PortfolioItem

class PortfolioItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioItem
        fields = ['id', 'provider', 'title', 'description', 'image', 'image_url', 'created_at']
        read_only_fields = ['id', 'provider', 'created_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
