"""
Create demo admin and partner accounts with Django-compatible PBKDF2 passwords.
Columns: id, email, password, full_name, phone, role, is_active, is_staff
         (created_at / updated_at are auto-set)
         is_superuser comes from PermissionsMixin → separate table or same table
"""
import psycopg2, secrets, hashlib, base64, uuid
from datetime import datetime, timezone

def make_password(raw: str) -> str:
    """Django-compatible PBKDF2-SHA256 hash."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', raw.encode(), salt.encode(), 870000)
    return f"pbkdf2_sha256$870000${salt}${base64.b64encode(dk).decode()}"

conn = psycopg2.connect(
    dbname='partyhub_db', user='partyhub',
    password='partyhub_pass', host='127.0.0.1', port=5433,
)
conn.autocommit = False
cur = conn.cursor()

# Show ALL columns so we know exactly what exists
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position;
""")
cols = cur.fetchall()
print("=== users table columns ===")
for c in cols:
    print(f"  {c[0]:<30} {c[1]}")

col_names = [c[0] for c in cols]

# Build INSERT based on available columns
def upsert_user(email, password_hash, full_name, phone, role, is_staff):
    uid = str(uuid.uuid4())
    # Determine which optional columns exist and build the query dynamically
    now = datetime.now(timezone.utc)
    base_cols = ['id', 'email', 'password', 'full_name', 'phone', 'role', 'is_active', 'is_staff']
    base_vals = [uid, email, password_hash, full_name, phone, role, True, is_staff]
    # Add timestamp columns if they exist in the table
    for ts_col in ['created_at', 'updated_at', 'date_joined', 'last_login']:
        if ts_col in col_names:
            base_cols.append(ts_col)
            base_vals.append(now)

    if 'is_superuser' in col_names:
        base_cols.append('is_superuser')
        base_vals.append(is_staff)  # superuser = same as is_staff for admin

    col_str = ', '.join(base_cols)
    ph_str  = ', '.join(['%s'] * len(base_vals))
    update_str = ', '.join([f"{c}=EXCLUDED.{c}" for c in ['password', 'is_active', 'role', 'is_staff']])

    sql = f"""
        INSERT INTO users ({col_str})
        VALUES ({ph_str})
        ON CONFLICT (email) DO UPDATE SET {update_str}
        RETURNING email, role;
    """
    cur.execute(sql, base_vals)
    return cur.fetchone()

# Create admin
r = upsert_user('admin@partyhub.in', make_password('Admin@123'),
                'Admin User', '9000000001', 'admin', True)
print(f"\nAdmin  → {r}")

# Create partner
r = upsert_user('partner@partyhub.in', make_password('Partner@123'),
                'Demo Partner', '9000000002', 'partner', False)
print(f"Partner→ {r}")

# Fetch the partner's actual saved ID for hall reassignment
cur.execute("SELECT id FROM users WHERE email = 'partner@partyhub.in';")
partner_id = cur.fetchone()[0]

# Assign halls with missing/invalid partner to demo partner
cur.execute("""
    UPDATE party_halls SET partner_id = %s
    WHERE partner_id IS NULL OR partner_id NOT IN (SELECT id FROM users);
""", (partner_id,))
print(f"Halls updated: {cur.rowcount}")

# Also run the owner backfill again now that partner exists
cur.execute("""
    UPDATE bookings SET owner_id = ph.partner_id
    FROM party_halls ph
    WHERE bookings.hall_id = ph.id
      AND bookings.owner_id IS NULL
      AND ph.partner_id IS NOT NULL;
""")
print(f"Bookings backfilled: {cur.rowcount}")

conn.commit()
cur.close()
conn.close()

print("\n✅ All done!")
print("   admin@partyhub.in   → Admin@123")
print("   partner@partyhub.in → Partner@123")
