#!/usr/bin/env python
"""
Standalone backfill script: run as
    python run_backfill.py
from the backend directory (where manage.py lives).
"""
import django, os, sys

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bookings.models import Booking

bookings = Booking.objects.filter(owner__isnull=True).select_related('hall__partner')
count = 0
for b in bookings:
    if b.hall and b.hall.partner:
        b.owner = b.hall.partner
        b.save(update_fields=['owner'])
        count += 1

total_with_owner = Booking.objects.filter(owner__isnull=False).count()
total_null = Booking.objects.filter(owner__isnull=True).count()
print(f"Backfilled {count} bookings.")
print(f"Total with owner set: {total_with_owner}")
print(f"Total with owner still NULL: {total_null}")
