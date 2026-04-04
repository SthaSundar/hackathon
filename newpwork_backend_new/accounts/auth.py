from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
import jwt
from django.conf import settings
from .models import User

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        print(f"DEBUG: Auth header: {auth_header}")
        if not auth_header or not auth_header.startswith("Bearer "):
            print("DEBUG: No Bearer token found")
            return None

        token = auth_header.split(" ")[1]
        print(f"DEBUG: Token: {token[:20]}...")
        try:
            secret = getattr(settings, "NEXTAUTH_SECRET", settings.SECRET_KEY)
            print(f"DEBUG: Using secret: {secret[:20]}...")
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            print(f"DEBUG: Payload: {payload}")
            user = User.objects.get(email=payload["email"])
            print(f"DEBUG: User found: {user.email}")
            # Ensure we're using the role from the database, not from token
            # The database is the source of truth for user roles
            return (user, None)
        except jwt.ExpiredSignatureError:
            print("DEBUG: Token expired")
            raise exceptions.AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError as e:
            print(f"DEBUG: Invalid token error: {e}")
            # Log for debugging but don't expose details
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Invalid token: {str(e)}")
            raise exceptions.AuthenticationFailed("Invalid token")
        except User.DoesNotExist:
            print("DEBUG: User not found")
            raise exceptions.AuthenticationFailed("User not found")
        except Exception as e:
            print(f"DEBUG: Authentication error: {e}")
            # Log the error but don't raise - let other auth methods try
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Authentication error: {str(e)}")
            return None
