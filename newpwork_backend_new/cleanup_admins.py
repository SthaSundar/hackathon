import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'newpwork_backend_new.settings')
django.setup()

from accounts.models import User

# Delete all superusers and staff users to start clean
admins = User.objects.filter(is_superuser=True) | User.objects.filter(is_staff=True)
count = admins.count()
admins.delete()

print(f"Deleted {count} administrative users.")
