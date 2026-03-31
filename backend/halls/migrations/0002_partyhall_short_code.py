"""
Safe 3-phase migration for PartyHall.short_code:
  Phase 1 — Add nullable, non-unique column (existing rows get NULL)
  Phase 2 — Populate unique short_codes for all existing rows (data migration)
  Phase 3 — Nothing extra needed; uniqueness enforced only at app level via save()

Uniqueness is NOT enforced at DB level here to avoid re-migration pain.
The model's save() guarantees uniqueness through conditional generation.
"""
import random
import string

from django.db import migrations, models


def populate_short_codes(apps, schema_editor):
    """Assign unique short_codes to existing halls."""
    PartyHall = apps.get_model('halls', 'PartyHall')
    used = set()

    for hall in PartyHall.objects.order_by('created_at'):
        clean = ''.join(c for c in hall.name if c.isalnum()).upper()
        code = clean[:3] or 'PH'

        # Make unique within this migration run
        original = code
        attempt = 0
        while code in used:
            attempt += 1
            code = original[:2] + ''.join(random.choices(string.ascii_uppercase, k=2))
            if attempt > 20:
                code = ''.join(random.choices(string.ascii_uppercase, k=4))

        used.add(code)
        PartyHall.objects.filter(pk=hall.pk).update(short_code=code)


class Migration(migrations.Migration):

    dependencies = [
        ('halls', '0001_initial'),
    ]

    operations = [
        # Phase 1: add nullable/non-unique column
        migrations.AddField(
            model_name='partyhall',
            name='short_code',
            field=models.CharField(
                max_length=10,
                blank=True,
                null=True,
                help_text='Unique 3-4 letter code for booking references',
            ),
        ),
        # Phase 2: populate data for all existing rows
        migrations.RunPython(populate_short_codes, migrations.RunPython.noop),
    ]
