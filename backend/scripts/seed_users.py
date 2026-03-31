"""
Create demo users via Django ORM after migrations are applied.
Run from backend/: python seed_users.py
"""
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import django
django.setup()

from accounts.models import User
from django.contrib.auth import authenticate

demo = [
    ('admin@partyhub.in',    'Admin@123',    'Super Admin',   'admin',    True,  True),
    ('partner@partyhub.in',  'Partner@123',  'Test Partner',  'partner',  False, False),
    ('customer@partyhub.in', 'Customer@123', 'Test Customer', 'customer', False, False),
]

print("Creating users...")
for email, pw, name, role, is_staff, is_super in demo:
    u, created = User.objects.get_or_create(
        email=email,
        defaults={'full_name': name, 'role': role, 'is_staff': is_staff, 'is_superuser': is_super}
    )
    u.set_password(pw)
    u.full_name = name
    u.role = role
    u.is_staff = is_staff
    u.is_superuser = is_super
    u.save()
    action = 'CREATED' if created else 'UPDATED'
    print(f"  [{action}] {email} (role={u.role}, id={u.id})")

print("\nVerifying authentication...")
for email, pw, name, role, *_ in demo:
    u = authenticate(email=email, password=pw)
    if u:
        print(f"  [OK] {email} -> role={u.role}")
    else:
        print(f"  [FAIL] {email} -- check password/model")

print("\nTotal users in DB:", User.objects.count())
