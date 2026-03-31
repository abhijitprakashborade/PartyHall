import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def inspect_columns(table_name):
    with connection.cursor() as cursor:
        print(f"Inspecting columns for {table_name}...")
        cursor.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '{table_name}' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        cols = cursor.fetchall()
        for col, dtype in cols:
            print(f" - {col} ({dtype})")
        if not cols:
            print("No columns found.")

if __name__ == "__main__":
    inspect_columns("party_halls")
