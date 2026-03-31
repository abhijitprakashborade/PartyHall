"""
Investigate booking PH-2026-86187 and related slots.
Run: python manage.py shell < investigate_booking.py
"""
from bookings.models import Booking, Slot
from halls.models import PartyHall

# Check the confirmed booking
bookings = Booking.objects.filter(status__in=['confirmed', 'pending']).select_related('slot', 'hall')
for b in bookings:
    print(f"Booking: {b.booking_ref}")
    print(f"  Hall: {b.hall.name if b.hall else 'NONE'}")
    print(f"  Status: {b.status}")
    print(f"  Slot FK: {b.slot_id}")
    print(f"  Slot date: {b.slot_date}")
    print(f"  Slot time: {b.slot_start_time} - {b.slot_end_time}")
    if b.slot:
        print(f"  Slot status in DB: {b.slot.status}")
    else:
        print(f"  ⚠️  NO SLOT FK — booking has no linked slot object!")
    print()

# Check what slots exist for this hall/date
print("=== Slots for 2026-03-16 ===")
for slot in Slot.objects.filter(date='2026-03-16').select_related('hall'):
    print(f"  [{slot.hall.name}] {slot.start_time}-{slot.end_time} → status={slot.status} | locked_until={slot.locked_until}")
