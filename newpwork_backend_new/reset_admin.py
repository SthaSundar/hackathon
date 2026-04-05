import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'newpwork_backend_new.settings')
django.setup()

from accounts.models import User, UserRole

# 1. Delete all existing admins (Superusers and Staff)
admins = User.objects.filter(is_superuser=True) | User.objects.filter(is_staff=True)
count = admins.count()
admins.delete()
print(f"Deleted {count} administrative users.")

# 2. Create the new admin
username = 'admin'
email = 'admin@example.com'
password = 'admin_pass123'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password, role=UserRole.ADMIN)
    print(f"Successfully created new superuser: {username} with role=ADMIN")
else:
    # If a non-admin user with 'admin' username exists, update it to superuser
    user = User.objects.get(username=username)
    user.is_superuser = True
    user.is_staff = True
    user.role = UserRole.ADMIN
    user.set_password(password)
    user.save()
    print(f"Updated existing user '{username}' to superuser with role=ADMIN.")
