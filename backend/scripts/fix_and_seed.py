"""
Fix Supabase users table: add columns that Django's AbstractBaseUser requires
but weren't in the original schema.sql.
Run: python manage.py fix_users_table
"""
import os, sys, django

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

columns_to_add = [
    ("last_login", "TIMESTAMP WITH TIME ZONE NULL"),
    ("is_superuser", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("is_staff", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("password",  "VARCHAR(128) NOT NULL DEFAULT ''"),
]

with connection.cursor() as cursor:
    # Check existing columns
    cursor.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = 'public'
    """)
    existing = {row[0] for row in cursor.fetchall()}
    print("Existing columns:", existing)

    for col, definition in columns_to_add:
        if col not in existing:
            try:
                cursor.execute(f'ALTER TABLE "users" ADD COLUMN "{col}" {definition}')
                print(f"[ADDED] {col}")
            except Exception as e:
                print(f"[ERR] {col}: {e}")
        else:
            print(f"[SKIP] {col} already exists")

print("\nColumn check complete. Now creating users...")

from accounts.models import User

accounts = [
    ('admin@partyhub.in',    'Admin@123',    'Super Admin',   'admin',   True,  True),
    ('partner@partyhub.in',  'Partner@123',  'Test Partner',  'partner', False, False),
    ('customer@partyhub.in', 'Customer@123', 'Test Customer', 'customer',False, False),
]

for email, pw, name, role, is_staff, is_super in accounts:
    try:
        u, created = User.objects.get_or_create(email=email, defaults={
            'full_name': name, 'role': role, 'is_staff': is_staff, 'is_superuser': is_super
        })
        u.set_password(pw)
        u.full_name = name
        u.role = role
        u.is_staff = is_staff
        u.is_superuser = is_super
        u.save()
        print(f"[OK] {email} ({role}) — {'created' if created else 'updated'}")
    except Exception as e:
        print(f"[ERR] {email}: {type(e).__name__}: {str(e)[:200]}")

print("\nAll done! Test login at http://localhost:8000/api/auth/login/")
print("  admin@partyhub.in / Admin@123")
print("  partner@partyhub.in / Partner@123")
