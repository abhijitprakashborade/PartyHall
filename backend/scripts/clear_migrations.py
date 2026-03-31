import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def clear_migrations():
    with connection.cursor() as cursor:
        print("Clearing migration history for halls and bookings...")
        cursor.execute("DELETE FROM django_migrations WHERE app IN ('halls', 'bookings');")
        print("Done.")

if __name__ == "__main__":
    clear_migrations()
