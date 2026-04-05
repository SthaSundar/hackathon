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

from .portfolio_views import list_portfolio, add_portfolio_item, portfolio_item_detail, my_portfolio

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
            "create_service": "/api/services/services/create/",
            "portfolio_list": "/api/services/providers/<id>/portfolio/",
            "portfolio_add": "/api/services/portfolio/add/",
            "portfolio_delete": "/api/services/portfolio/<id>/"
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
    
    # Portfolio endpoints
    path("portfolio/my/", my_portfolio, name="my_portfolio"),
    path("providers/<int:provider_id>/portfolio/", list_portfolio, name="list_portfolio"),
    path("portfolio/add/", add_portfolio_item, name="add_portfolio_item"),
    path("portfolio/<int:item_id>/", portfolio_item_detail, name="portfolio_item_detail"),
]


