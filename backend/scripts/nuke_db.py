import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def nuke_all_tables():
    with connection.cursor() as cursor:
        print("Fetching all table names...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        """)
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Dropping {len(tables)} tables...")
        for table in tables:
            try:
                cursor.execute(f'DROP TABLE "{table}" CASCADE;')
                print(f" - Dropped {table}")
            except Exception as e:
                print(f" - Error dropping {table}: {e}")
        print("Done.")

if __name__ == "__main__":
    nuke_all_tables()
