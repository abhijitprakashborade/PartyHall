"""
refresh_demo_subs — extend all partner subscriptions to 30 days from now.

Run automatically by dev.bat on every local startup so demo halls
never disappear due to trial expiry during development sessions.

Usage:
    python manage.py refresh_demo_subs
    python manage.py refresh_demo_subs --days 90
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = "Extend all partner subscriptions / trials to N days from now (dev use only)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=30,
            help='Number of days to extend each subscription (default: 30).'
        )

    def handle(self, *args, **options):
        from subscriptions.models import Subscription
        from halls.models import PartyHall

        days = options['days']
        now = timezone.now()
        new_expiry = now + timedelta(days=days)

        subs = Subscription.objects.select_related('partner').all()
        updated = 0

        for sub in subs:
            sub.expires_at = new_expiry
            # Re-activate expired / cancelled trials so halls become visible
            if sub.status in ('expired', 'cancelled'):
                sub.status = 'trial' if sub.is_trial else 'active'
            sub.save(update_fields=['expires_at', 'status', 'updated_at'])

            # Re-activate any halls that were hidden due to expired subscription
            reactivated = PartyHall.objects.filter(
                partner=sub.partner,
                status='subscription_expired',
            ).update(status='approved', is_active=True)

            self.stdout.write(
                self.style.SUCCESS(
                    f"  {sub.partner.email}: extended to {new_expiry.strftime('%Y-%m-%d %H:%M UTC')}"
                    + (f" ({reactivated} hall(s) reactivated)" if reactivated else "")
                )
            )
            updated += 1

        if updated == 0:
            self.stdout.write(self.style.WARNING("  No subscriptions found — nothing to refresh."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n  Done. {updated} subscription(s) extended by {days} days."))
