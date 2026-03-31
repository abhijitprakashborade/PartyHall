"""
Management command: seed_default_packages

Backfills the 3 default packages (Silver, Gold, Platinum) for any existing
PartyHall that has fewer than 3 packages. Safe to run multiple times.

Usage:
    python manage.py seed_default_packages
"""

from django.core.management.base import BaseCommand
from halls.models import PartyHall, Package, DEFAULT_PACKAGES


class Command(BaseCommand):
    help = 'Seed default Silver/Gold/Platinum packages for halls that have none'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        halls = PartyHall.objects.all()
        total_created = 0

        for hall in halls:
            existing_count = hall.packages.count()
            if existing_count >= 3:
                self.stdout.write(f'  SKIP  {hall.name} (already has {existing_count} packages)')
                continue

            if dry_run:
                self.stdout.write(f'  [DRY] Would seed 3 packages for: {hall.name}')
                continue

            # Delete any partial packages and re-seed cleanly
            if existing_count > 0:
                hall.packages.all().delete()

            for pkg_data in DEFAULT_PACKAGES:
                Package.objects.create(hall=hall, **pkg_data)
                total_created += 1

            self.stdout.write(
                self.style.SUCCESS(f'  ✓  Seeded 3 packages for: {hall.name}')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone! Created {total_created} packages across {halls.count()} halls.'
                if not dry_run else '\nDry run complete — no changes made.'
            )
        )
