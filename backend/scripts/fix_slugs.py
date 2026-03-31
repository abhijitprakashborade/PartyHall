"""
fix_slugs.py – Run once to fix any PartyHall slugs that contain spaces or
               other non-URL-safe characters.

Usage (from backend/ directory with venv active):
    python fix_slugs.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils.text import slugify
from halls.models import PartyHall
import random
import string


def make_unique_slug(name, exclude_id=None):
    base = slugify(name)
    slug = base + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    # Keep regenerating if collision (extremely unlikely but safe)
    qs = PartyHall.objects.filter(slug=slug)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    while qs.exists():
        slug = base + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        qs = PartyHall.objects.filter(slug=slug)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
    return slug


bad_halls = [h for h in PartyHall.objects.all() if ' ' in (h.slug or '') or not h.slug]

if not bad_halls:
    print("✅ All slugs look clean — nothing to fix.")
else:
    print(f"Found {len(bad_halls)} hall(s) with bad/missing slugs:\n")
    for hall in bad_halls:
        old_slug = hall.slug
        new_slug = make_unique_slug(hall.name, exclude_id=hall.id)
        hall.slug = new_slug
        # Use update_fields to bypass the save() guard so we don't re-trigger signal
        hall.save(update_fields=['slug'])
        print(f"  [{hall.id}] '{hall.name}'")
        print(f"    old slug: {repr(old_slug)}")
        print(f"    new slug: {repr(new_slug)}\n")

    print(f"✅ Fixed {len(bad_halls)} hall(s).")
