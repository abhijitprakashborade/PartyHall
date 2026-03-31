"""
Raw SQL user insert — get the actual column list first, then insert only required columns.
Run: python raw_insert.py  (from backend/)
"""
import os, sys, uuid
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import django; django.setup()

from django.db import connection
from django.contrib.auth.hashers import make_password

with connection.cursor() as cur:
    # Get column names
    cur.execute("""
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name='users' AND table_schema='public'
        ORDER BY ordinal_position
    """)
    cols = cur.fetchall()
    col_names = [c[0] for c in cols]
    print("Columns:", col_names)

    # Try inserting admin row with only required fields
    demo = [
        (str(uuid.uuid4()), 'admin@partyhub.in',    make_password('Admin@123'),    'Super Admin',  'admin',    True,  True),
        (str(uuid.uuid4()), 'partner@partyhub.in',  make_password('Partner@123'),  'Test Partner', 'partner',  False, False),
        (str(uuid.uuid4()), 'customer@partyhub.in', make_password('Customer@123'), 'Test Customer','customer', False, False),
    ]

    for uid, email, pw_hash, name, role, is_staff, is_super in demo:
        # Build insert with only columns that exist
        data = {'id': uid, 'email': email, 'full_name': name, 'role': role, 'is_active': True}
        if 'password' in col_names: data['password'] = pw_hash
        if 'is_staff' in col_names: data['is_staff'] = is_staff
        if 'is_superuser' in col_names: data['is_superuser'] = is_super
        if 'last_login' in col_names: data['last_login'] = None

        cols_str = ', '.join(f'"{k}"' for k in data)
        placeholders = ', '.join(['%s'] * len(data))
        values = list(data.values())

        try:
            cur.execute(f'INSERT INTO "users" ({cols_str}) VALUES ({placeholders}) ON CONFLICT (email) DO UPDATE SET "password"=%s, "role"=%s, "is_staff"=%s, "is_superuser"=%s',
                       values + [pw_hash, role, is_staff, is_super])
            print(f"[OK] {email}")
        except Exception as e:
            print(f"[ERR] {email}: {type(e).__name__}: {str(e)[:300]}")

    cur.execute("SELECT email, role, is_active FROM users")
    print("\nAll users:", cur.fetchall())

# Verify Django auth
print("\nVerifying with authenticate()…")
from django.contrib.auth import authenticate
for uid, email, _, name, role, *_ in demo:
    pw = 'Admin@123' if role == 'admin' else ('Partner@123' if role == 'partner' else 'Customer@123')
    u = authenticate(email=email, password=pw)
    print(f"  {'✓' if u else '✗'} {email} role={getattr(u,'role','N/A') if u else 'FAIL'}")
