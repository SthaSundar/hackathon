from django.urls import path
from . import views
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .views import sync_user, stats, user_stats, login, register, submit_kyc, get_kyc_status, list_pending_kyc, verify_kyc, token_by_email, list_users, delete_user, set_user_active, list_kyc, list_notifications, mark_notification_read, mark_all_notifications_read, unread_notifications_count, user_status

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_endpoint(request):
    """Test endpoint to verify authentication and routing"""
    return Response({"message": "Endpoint is working", "user": request.user.email})

def accounts_home(request):
    """Default view for /api/accounts/"""
    return JsonResponse({
        "message": "Accounts API",
        "endpoints": {
            "login": "/api/accounts/login/",
            "register": "/api/accounts/register/",
            "sync": "/api/accounts/sync/",
            "stats": "/api/accounts/stats/",
            "user_stats": "/api/accounts/user-stats/",
            "token_by_email": "/api/accounts/token-by-email/",
            "users": "/api/accounts/users/",
            "user_delete": "/api/accounts/users/<id>/",
            "user_set_active": "/api/accounts/users/<id>/status/",
            "kyc_submit": "/api/accounts/kyc/submit/",
            "kyc_status": "/api/accounts/kyc/status/",
            "kyc_pending": "/api/accounts/kyc/pending/",
            "kyc_list": "/api/accounts/kyc/list/?status=pending|approved|rejected|all",
            "kyc_verify": "/api/accounts/kyc/<id>/verify/",
            "user_status": "/api/accounts/user-status/",
        }
    })

urlpatterns = [
    path("", accounts_home, name="accounts_home"),
    path("login/", login, name="login"),
    path("register/", register, name="register"),
    path("token-by-email/", token_by_email, name="token_by_email"),
    path("sync/", sync_user, name="sync_user"),
    path("stats/", stats, name="stats"),
    path("user-stats/", user_stats, name="user_stats"),
    path("user-status/", user_status, name="user_status"),
    path("test/", test_endpoint, name="test_endpoint"),
    path("kyc/submit/", submit_kyc, name="submit_kyc"),
    path("kyc/status/", get_kyc_status, name="get_kyc_status"),
    path("kyc/pending/", list_pending_kyc, name="list_pending_kyc"),
    path("kyc/list/", list_kyc, name="list_kyc"),
    path("kyc/<int:kyc_id>/verify/", verify_kyc, name="verify_kyc"),
    path("users/", list_users, name="list_users"),
    path("users/<int:user_id>/", delete_user, name="delete_user"),
    path("users/<int:user_id>/status/", set_user_active, name="set_user_active"),
    path("notifications/", list_notifications, name="list_notifications"),
    path("notifications/<int:notification_id>/read/", mark_notification_read, name="mark_notification_read"),
    path("notifications/read-all/", mark_all_notifications_read, name="mark_all_notifications_read"),
    path("notifications/unread-count/", unread_notifications_count, name="unread_notifications_count"),
]
