import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def raw_inspect():
    with connection.cursor() as cursor:
        print("Raw inspection of party_halls...")
        try:
            cursor.execute("SELECT * FROM party_halls LIMIT 0;")
            colnames = [desc[0] for desc in cursor.description]
            print("Columns found using cursor.description:")
            for col in colnames:
                print(f" - {col}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    raw_inspect()
