import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'newpwork_backend_new.settings')
django.setup()

from accounts.models import User

def debug_users():
    print("--- User Debug Information ---")
    users = User.objects.filter(username='admin')
    if not users.exists():
        print("No user with username 'admin' found.")
        return

    for user in users:
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Is Staff: {user.is_staff}")
        print(f"Is Superuser: {user.is_superuser}")
        print(f"Is Active: {user.is_active}")
        print(f"Role: {user.role}")
        print(f"Has Usable Password: {user.has_usable_password()}")
        
    print("-------------------------------")

if __name__ == "__main__":
    debug_users()
