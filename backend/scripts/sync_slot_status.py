"""
Sync slot status: mark all slots as 'booked' that have a confirmed/pending Booking.
Fixes the issue where slot.status was not updated after a successful payment.

Run: python manage.py shell < sync_slot_status.py
"""
from bookings.models import Booking, Slot

fixed = 0
for booking in Booking.objects.filter(status__in=['confirmed', 'pending']).select_related('slot'):
    slot = booking.slot
    if slot and slot.status != 'booked':
        old_status = slot.status
        slot.status = 'booked'
        slot.locked_by = None
        slot.locked_until = None
        slot.save(update_fields=['status', 'locked_by', 'locked_until'])
        fixed += 1
        print(f"Fixed slot {slot.id}: {old_status} → booked (booking {booking.booking_ref})")

print(f"\n✅ Done. Fixed {fixed} slot(s).")
