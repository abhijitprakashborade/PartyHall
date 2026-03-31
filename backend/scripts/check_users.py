"""
1. Lists all users in the 'users' table.
2. Resets password for admin@partyhub.in  → 'Admin@123'
             and partner@partyhub.in → 'Partner@123'
Uses Django's PBKDF2-SHA256 format so the running server accepts them.
"""
import psycopg2, hashlib, hmac, base64, os, binascii, struct

# ---------- Minimal Django PBKDF2 hash (matches django.contrib.auth) ----------
def _pbkdf2(password: str, salt: str, iterations: int = 870000) -> str:
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), iterations)
    hash_b64 = base64.b64encode(dk).decode()
    return f"pbkdf2_sha256${iterations}${salt}${hash_b64}"

import secrets
def make_password(raw: str) -> str:
    salt = secrets.token_hex(16)          # 32-char hex salt
    return _pbkdf2(raw, salt)

# ---------- DB connection ----------
conn = psycopg2.connect(
    dbname='partyhub_db', user='partyhub',
    password='partyhub_pass', host='127.0.0.1', port=5433,
)
conn.autocommit = False
cur = conn.cursor()

# 1. List users
cur.execute("SELECT id, email, full_name, role, is_active FROM users ORDER BY role, email;")
rows = cur.fetchall()
print("\n=== USERS IN DB ===")
print(f"{'Email':<35} {'Role':<12} {'Active'}")
print("-" * 60)
for r in rows:
    print(f"{r[1]:<35} {r[3]:<12} {r[4]}")

# 2. Reset passwords
resets = [
    ('admin@partyhub.in',   'Admin@123'),
    ('partner@partyhub.in', 'Partner@123'),
]
print("\n=== RESETTING PASSWORDS ===")
for email, raw in resets:
    new_hash = make_password(raw)
    cur.execute(
        "UPDATE users SET password = %s, is_active = TRUE WHERE email = %s RETURNING email;",
        (new_hash, email)
    )
    updated = cur.fetchone()
    if updated:
        print(f"  ✅  {email}  →  password set to '{raw}'")
    else:
        print(f"  ⚠️  No user found for {email}  (no update)")

conn.commit()
cur.close()
conn.close()
print("\nDone.")
