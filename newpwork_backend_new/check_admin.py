import os
import django
from django.contrib.auth import authenticate

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'newpwork_backend_new.settings')
django.setup()

from accounts.models import User, UserRole

def reset_and_verify():
    username = 'admin'
    password = 'admin_pass123'
    email = 'admin@example.com'

    # 1. Delete existing admin
    User.objects.filter(username=username).delete()
    print(f"Cleared existing '{username}' user.")

    # 2. Create fresh superuser
    user = User.objects.create_superuser(
        username=username, 
        email=email, 
        password=password,
        role=UserRole.ADMIN,
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    print(f"Created user: {user.username}")
    print(f"Flags: is_staff={user.is_staff}, is_superuser={user.is_superuser}, is_active={user.is_active}, role={user.role}")

    # 3. Test authentication
    auth_user = authenticate(username=username, password=password)
    if auth_user:
        print("✅ SUCCESS: Programmatic authentication succeeded.")
    else:
        print("❌ FAILURE: Programmatic authentication failed.")

if __name__ == "__main__":
    reset_and_verify()
