"""
Inspect the users table structure and try inserting a bare-minimum row.
Run: python inspect_table.py  (from backend/ folder)
"""
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import django; django.setup()

from django.db import connection

with connection.cursor() as cur:
    # Full column list
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name='users' AND table_schema='public'
        ORDER BY ordinal_position
    """)
    print("=== users columns ===")
    for row in cur.fetchall():
        print(f"  {row[0]:30s} {row[1]:25s} nullable={row[2]}  default={row[3]}")

    # FK constraints
    cur.execute("""
        SELECT tc.constraint_name, kcu.column_name,
               ccu.table_name AS foreign_table, ccu.column_name AS foreign_col
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name
        WHERE tc.table_name='users' AND tc.constraint_type='FOREIGN KEY'
    """)
    print("\n=== FK constraints ===")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]} -> {row[2]}.{row[3]}")

    # Row count
    cur.execute("SELECT COUNT(*) FROM users")
    print(f"\nRow count: {cur.fetchone()[0]}")
