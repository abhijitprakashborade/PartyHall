import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from halls.models import PartyHall

def check_halls():
    count = PartyHall.objects.count()
    print(f"Total halls in database: {count}")
    for hall in PartyHall.objects.all():
        print(f" - {hall.name} (Status: {hall.status}, Active: {hall.is_active})")

if __name__ == "__main__":
    check_halls()
