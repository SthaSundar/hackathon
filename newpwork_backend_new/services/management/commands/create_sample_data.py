from django.core.management.base import BaseCommand
from django.utils.text import slugify
from services.category_models import ServiceCategory
from services.service_models import Service
from accounts.models import User, UserRole


class Command(BaseCommand):
    help = 'Create sample categories and services for testing'

    def handle(self, *args, **options):
        # Create sample categories
        categories_data = [
            {"name": "Home Services", "description": "Cleaning, maintenance, and home improvement services"},
            {"name": "Tech Services", "description": "Web development, IT support, and technical services"},
            {"name": "Creative Services", "description": "Design, photography, and creative work"},
            {"name": "Professional Services", "description": "Consulting, legal, and business services"},
        ]

        for cat_data in categories_data:
            category, created = ServiceCategory.objects.get_or_create(
                name=cat_data["name"],
                defaults={
                    "slug": slugify(cat_data["name"]),
                    "description": cat_data["description"]
                }
            )
            if created:
                self.stdout.write(f"Created category: {category.name}")

        # Get or create a provider user
        provider, created = User.objects.get_or_create(
            email="provider@example.com",
            defaults={
                "username": "provider",
                "role": UserRole.PROVIDER,
                "display_name": "Sample Provider"
            }
        )
        if created:
            self.stdout.write(f"Created provider user: {provider.email}")

        # Create sample services
        services_data = [
            {
                "title": "Web Development",
                "description": "Full-stack web development services including frontend, backend, and database design.",
                "base_price": "25000.00",
                "pricing_type": "fixed",
                "location": "Kathmandu, Nepal",
                "category_name": "Tech Services"
            },
            {
                "title": "Home Cleaning",
                "description": "Professional home cleaning services including deep cleaning and regular maintenance.",
                "base_price": "1500.00",
                "pricing_type": "hourly",
                "location": "Kathmandu Valley",
                "category_name": "Home Services"
            },
            {
                "title": "Graphic Design",
                "description": "Logo design, branding, and graphic design services for businesses and individuals.",
                "base_price": "5000.00",
                "pricing_type": "fixed",
                "location": "Remote",
                "category_name": "Creative Services"
            },
        ]

        for service_data in services_data:
            category = ServiceCategory.objects.get(name=service_data["category_name"])
            service, created = Service.objects.get_or_create(
                title=service_data["title"],
                provider=provider,
                defaults={
                    "slug": slugify(service_data["title"]),
                    "description": service_data["description"],
                    "base_price": service_data["base_price"],
                    "pricing_type": service_data["pricing_type"],
                    "location": service_data["location"],
                    "category": category,
                    "is_active": True
                }
            )
            if created:
                self.stdout.write(f"Created service: {service.title}")

        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))





