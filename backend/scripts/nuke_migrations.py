import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def nuke_migrations():
    with connection.cursor() as cursor:
        print("Wiping all migration history...")
        cursor.execute("TRUNCATE TABLE django_migrations;")
        print("Done.")

if __name__ == "__main__":
    nuke_migrations()
