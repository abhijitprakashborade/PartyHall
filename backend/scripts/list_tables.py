import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def list_tables():
    with connection.cursor() as cursor:
        print("Listing tables in public schema...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        for t in tables:
            print(f" - {t[0]}")
        if not tables:
            print("No tables found.")

if __name__ == "__main__":
    list_tables()
