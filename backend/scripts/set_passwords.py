"""
Force-set passwords for demo users in Supabase PostgreSQL.
Run from backend/ folder: python set_passwords.py
"""
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from django.contrib.auth.hashers import make_password
from django.db import connection

demo_users = [
    ('admin@partyhub.in',    'Admin@123',    'Super Admin',   'admin',    True,  True),
    ('partner@partyhub.in',  'Partner@123',  'Test Partner',  'partner',  False, False),
    ('customer@partyhub.in', 'Customer@123', 'Test Customer', 'customer', False, False),
]

with connection.cursor() as cur:
    for email, pw, name, role, is_staff, is_super in demo_users:
        hashed = make_password(pw)
        # Upsert: try update first, then insert
        cur.execute("SELECT id FROM users WHERE email = %s", [email])
        row = cur.fetchone()
        if row:
            cur.execute("""
                UPDATE users
                SET password=%s, full_name=%s, role=%s,
                    is_staff=%s, is_superuser=%s, is_active=TRUE
                WHERE email=%s
            """, [hashed, name, role, is_staff, is_super, email])
            print(f"[UPDATED] {email}")
        else:
            import uuid
            cur.execute("""
                INSERT INTO users
                    (id, email, password, full_name, role,
                     is_staff, is_superuser, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
            """, [str(uuid.uuid4()), email, hashed, name, role, is_staff, is_super])
            print(f"[CREATED] {email}")

print("\nTesting login via Django auth…")
from django.contrib.auth import authenticate
for email, pw, *_ in demo_users:
    u = authenticate(email=email, password=pw)
    if u:
        print(f"  ✓ {email} OK (role={u.role})")
    else:
        print(f"  ✗ {email} FAILED")
