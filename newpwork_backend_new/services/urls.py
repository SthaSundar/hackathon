from django.urls import path
from django.http import JsonResponse
from .views import (
    list_categories,
    list_services,
    create_service,
    my_services,
    update_service,
    delete_service,
    service_detail,
)
from .category_views import create_category, update_category, delete_category

def services_home(request):
    return JsonResponse({
        "message": "Services API",
        "endpoints": {
            "categories": "/api/services/categories/",
            "category_create": "/api/services/categories/create/",
            "category_update": "/api/services/categories/<id>/",
            "category_delete": "/api/services/categories/<id>/delete/",
            "services": "/api/services/services/",
            "my_services": "/api/services/services/my/",
            "create_service": "/api/services/services/create/"
        }
    })

urlpatterns = [
    path("", services_home, name="services_home"),
    path("categories/", list_categories, name="list_categories"),
    path("categories/create/", create_category, name="create_category"),
    path("categories/<int:category_id>/", update_category, name="update_category"),
    path("categories/<int:category_id>/delete/", delete_category, name="delete_category"),
    path("services/", list_services, name="list_services"),
    path("services/my/", my_services, name="my_services"),
    path("services/create/", create_service, name="create_service"),
    path("services/<int:service_id>/detail/", service_detail, name="service_detail"),
    path("services/<int:service_id>/", update_service, name="update_service"),
    path("services/<int:service_id>/delete/", delete_service, name="delete_service"),
]


