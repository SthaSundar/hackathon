import os
import django
from django.contrib.auth import authenticate

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'newpwork_backend_new.settings')
django.setup()

from accounts.models import User, UserRole

def create_and_test():
    username = 'admin'
    password = 'admin_pass123'
    email = 'admin2505@gmail.com' # Using user's admin email from .env

    # 1. Clean up
    User.objects.filter(username=username).delete()
    User.objects.filter(email=email).delete()
    print("Cleaned up existing users with same username/email.")

    # 2. Create user manually for maximum control
    user = User.objects.create_superuser(
        username=username, 
        email=email, 
        password=password
    )
    user.role = UserRole.ADMIN
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.save()

    print(f"User '{user.username}' created.")
    print(f"Email: {user.email}")
    print(f"Is Staff: {user.is_staff}")
    print(f"Is Superuser: {user.is_superuser}")
    print(f"Is Active: {user.is_active}")
    print(f"Role: {user.role}")

    # 3. Final verification with authenticate
    print("\n--- Testing Authentication ---")
    check_username = authenticate(username=username, password=password)
    if check_username:
        print("✅ Backend authentication (username) successful.")
    else:
        print("❌ Backend authentication (username) FAILED.")

    check_email = authenticate(username=email, password=password)
    if check_email:
        print("✅ Backend authentication (email) successful.")
    else:
        print("❌ Backend authentication (email) FAILED.")

    from django.conf import settings
    print(f"AUTHENTICATION_BACKENDS: {getattr(settings, 'AUTHENTICATION_BACKENDS', 'Default (ModelBackend)')}")

if __name__ == "__main__":
    create_and_test()
