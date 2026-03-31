import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def drop_custom_tables():
    # Order matters due to Foreign Keys
    tables = [
        'booking_addons',
        'bookings',
        'slots',
        'reviews',
        'packages',
        'party_hall_images',
        'addon_services',
        'party_halls',
        'subscriptions',
    ]
    with connection.cursor() as cursor:
        print("Dropping custom tables...")
        for table in tables:
            try:
                cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE;')
                print(f" - Dropped {table}")
            except Exception as e:
                print(f" - Error dropping {table}: {e}")
        print("Done.")

if __name__ == "__main__":
    drop_custom_tables()
