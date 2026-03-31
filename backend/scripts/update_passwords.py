"""
Update password for all demo users — UPDATE only, no INSERT.
Run from backend/ folder: python update_passwords.py
"""
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from django.contrib.auth.hashers import make_password
from django.db import connection

demo = [
    ('admin@partyhub.in',    'Admin@123',    'Super Admin',   'admin',    True,  True),
    ('partner@partyhub.in',  'Partner@123',  'Test Partner',  'partner',  False, False),
    ('customer@partyhub.in', 'Customer@123', 'Test Customer', 'customer', False, False),
]

with connection.cursor() as cur:
    # List all current users
    cur.execute("SELECT id, email, role FROM users ORDER BY email")
    existing = {row[1]: row[0] for row in cur.fetchall()}
    print("Existing users:", list(existing.keys()))

    for email, pw, name, role, is_staff, is_super in demo:
        hashed = make_password(pw)
        if email in existing:
            cur.execute("""
                UPDATE users
                SET "password"=%s, full_name=%s, role=%s,
                    is_staff=%s, is_superuser=%s, is_active=TRUE
                WHERE email=%s
            """, [hashed, name, role, is_staff, is_super, email])
            print(f"[UPDATED] {email} — {cur.rowcount} rows")
        else:
            print(f"[MISSING] {email} — will create via User model")
            from accounts.models import User
            try:
                u = User(email=email, full_name=name, role=role,
                         is_staff=is_staff, is_superuser=is_super, is_active=True)
                u.set_password(pw)
                u.save()
                print(f"[CREATED] {email}")
            except Exception as e:
                print(f"[ERR] {email}: {e}")

# Verify
print("\nVerifying with Django authenticate()…")
from django.contrib.auth import authenticate
for email, pw, *_ in demo:
    u = authenticate(email=email, password=pw)
    if u:
        print(f"  ✓ {email} (role={getattr(u, 'role', '?')})")
    else:
        print(f"  ✗ {email} — auth FAILED")
