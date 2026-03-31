"""
Management command: backfill Booking.owner from hall.partner for any rows
where owner is still NULL.

Run with:
    python manage.py backfill_booking_owners
"""
from django.core.management.base import BaseCommand
from bookings.models import Booking


class Command(BaseCommand):
    help = "Backfill Booking.owner from hall.partner for rows where owner is NULL"

    def handle(self, *args, **options):
        qs = Booking.objects.filter(owner__isnull=True).select_related('hall__partner')
        total = qs.count()
        self.stdout.write(f"Found {total} bookings with owner=NULL. Backfilling…")

        fixed = 0
        skipped = 0
        for b in qs:
            if b.hall and b.hall.partner:
                b.owner = b.hall.partner
                b.save(update_fields=['owner'])
                fixed += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Fixed: {fixed}  |  Skipped (no hall/partner): {skipped}"
        ))
        remaining = Booking.objects.filter(owner__isnull=True).count()
        self.stdout.write(f"Bookings still NULL: {remaining}")
