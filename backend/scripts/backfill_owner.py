"""
Backfill script: populate Booking.owner from Booking.hall.partner
Run with: python manage.py shell < backfill_owner.py
"""
from bookings.models import Booking

bookings = Booking.objects.filter(owner__isnull=True).select_related('hall__partner')
count = 0
for b in bookings:
    if b.hall and b.hall.partner:
        b.owner = b.hall.partner
        b.save(update_fields=['owner'])
        count += 1

print(f"Backfilled owner for {count} bookings.")
