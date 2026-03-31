"""
Direct psycopg2 backfill — no Django startup required.
Sets Booking.owner_id = hall.partner_id for every booking where owner is NULL.
"""
import psycopg2

SQL_BACKFILL = """
UPDATE bookings
SET owner_id = ph.partner_id
FROM party_halls ph
WHERE bookings.hall_id = ph.id
  AND bookings.owner_id IS NULL
  AND ph.partner_id IS NOT NULL;
"""

SQL_COUNT_FIXED  = "SELECT COUNT(*) FROM bookings WHERE owner_id IS NOT NULL;"
SQL_COUNT_NULL   = "SELECT COUNT(*) FROM bookings WHERE owner_id IS NULL;"

try:
    conn = psycopg2.connect(
        dbname='partyhub_db',
        user='partyhub',
        password='partyhub_pass',
        host='127.0.0.1',
        port=5433,
    )
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute(SQL_BACKFILL)
    rows_updated = cur.rowcount
    conn.commit()

    cur.execute(SQL_COUNT_FIXED)
    total_fixed = cur.fetchone()[0]

    cur.execute(SQL_COUNT_NULL)
    total_null = cur.fetchone()[0]

    print(f"✅  Backfill complete.")
    print(f"   Rows updated this run : {rows_updated}")
    print(f"   Bookings with owner   : {total_fixed}")
    print(f"   Bookings still NULL   : {total_null}")

    cur.close()
    conn.close()

except Exception as e:
    print(f"❌  Error: {e}")
