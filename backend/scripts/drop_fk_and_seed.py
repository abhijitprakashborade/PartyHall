"""
Drop the problematic users_id_fkey constraint, then seed demo users.
Run from backend/: python drop_fk_and_seed.py
"""
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import django
django.setup()

from django.db import connection

print("=== Checking and dropping FK constraints on users table ===")
with connection.cursor() as cur:
    cur.execute("""
        SELECT tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'users' AND tc.table_schema = 'public'
    """)
    constraints = cur.fetchall()
    print("All constraints:", constraints)

    for name, ctype in constraints:
        if ctype == 'FOREIGN KEY':
            try:
                cur.execute(f'ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "{name}" CASCADE')
                print(f"[DROPPED FK] {name}")
            except Exception as e:
                print(f"[ERR] {name}: {e}")

print("\n=== Creating demo users ===")
from accounts.models import User
from django.contrib.auth import authenticate

demo = [
    ('admin@partyhub.in',    'Admin@123',    'Super Admin',   'admin',    True,  True),
    ('partner@partyhub.in',  'Partner@123',  'Test Partner',  'partner',  False, False),
    ('customer@partyhub.in', 'Customer@123', 'Test Customer', 'customer', False, False),
]

for email, pw, name, role, is_staff, is_super in demo:
    try:
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
        print(f"  [{'CREATED' if created else 'UPDATED'}] {email}")
    except Exception as e:
        print(f"  [ERR] {email}: {type(e).__name__}: {str(e)[:250]}")

print("\n=== Verifying login ===")
for email, pw, *_ in demo:
    u = authenticate(email=email, password=pw)
    print(f"  {'[OK]' if u else '[FAIL]'} {email}")

print("\nTotal users:", User.objects.count())
