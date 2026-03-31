import os, sys, django

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

accounts = [
    ('admin@partyhub.in',    'Admin@123',    'Super Admin',   'admin'),
    ('partner@partyhub.in',  'Partner@123',  'Test Partner',  'partner'),
    ('customer@partyhub.in', 'Customer@123', 'Test Customer', 'customer'),
]

for email, pw, name, role in accounts:
    try:
        u, created = User.objects.get_or_create(email=email, defaults={'full_name': name, 'role': role})
        u.set_password(pw)
        u.full_name = name
        u.role = role
        if role == 'admin':
            u.is_staff = True
            u.is_superuser = True
        u.save()
        status = 'created' if created else 'updated'
        print(f"[OK] {email} ({role}) — {status}")
    except Exception as e:
        print(f"[ERR] {email}: {type(e).__name__}: {e}")

print("\nDone!")
