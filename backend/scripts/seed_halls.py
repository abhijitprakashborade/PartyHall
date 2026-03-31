"""
PostGIS Seed Script: Create demo halls with spatial coordinates (Chennai, TN).
Run from backend/: python seed_halls.py
"""
import os, sys, django
import uuid
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

# Removed Point import for Windows compatibility
from halls.models import PartyHall, Package, HallImage, AddonService
from accounts.models import User

def seed():
    print("Starting PostGIS seed...")

    # 1. Ensure a partner user exists
    partner, _ = User.objects.get_or_create(
        email='partner@partyhub.in',
        defaults={
            'full_name': 'Test Partner',
            'role': 'partner',
            'is_active': True
        }
    )
    if not partner.password:
        partner.set_password('Partner@123')
        partner.save()

    # 2. Sample halls in Chennai
    halls_data = [
        {
            'name': 'Grand Celebration Hall, Adyar',
            'city': 'Chennai',
            'pincode': '600020',
            'lat': 13.0067,
            'lng': 80.2578,
            'desc': 'Elegant hall for birthdays and weddings in the heart of Adyar.',
            'price': 1500
        },
        {
            'name': 'Elite Party Zone, T. Nagar',
            'city': 'Chennai',
            'pincode': '600017',
            'lat': 13.0418,
            'lng': 80.2341,
            'desc': 'Modern, high-tech party space perfect for corporate events and trendy celebrations.',
            'price': 2000
        },
        {
            'name': 'Silver Jubilee Hall, Anna Nagar',
            'city': 'Chennai',
            'pincode': '600040',
            'lat': 13.0850,
            'lng': 80.2101,
            'desc': 'Traditional yet fully-equipped hall with Sony Dolby Atmos sound system.',
            'price': 1200
        }
    ]

    for data in halls_data:
        hall, created = PartyHall.objects.get_or_create(
            name=data['name'],
            partner=partner,
            defaults={
                'description': data['desc'],
                'address': f"Main Road, {data['city']}",
                'city': data['city'],
                'pincode': data['pincode'],
                'latitude': data['lat'],
                'longitude': data['lng'],
                'price_per_slot': data['price'],
                'hourly_rate': data.get('hourly_rate', 500),
                'base_capacity': data.get('base_capacity', 15),
                'extra_guest_fee': 500,
                'is_active': True,
                'status': 'approved',
                'capacity_min': 10,
                'capacity_max': 100,
                'is_featured': True
            }
        )
        
        status = "CREATED" if created else "UPDATED"
        print(f"  [{status}] {hall.name} at {hall.latitude}, {hall.longitude}")

        # 3. Add all 6 canonical packages if none exist
        if not hall.packages.exists():
            PACKAGES = [
                {
                    'name': 'Silver', 'price': 1000,
                    'inclusions': ['Grandeur Decoration', 'Sony Dolby Atmos Sound', 'Full HD Projector', 'Welcome Drinks'],
                    'duration_hours': 1, 'max_people': 20, 'sort_order': 1,
                },
                {
                    'name': 'Gold', 'price': 1500,
                    'inclusions': ['Silver inclusions', 'Cool Cake (1kg)', 'Photo Frame (10x15")'],
                    'duration_hours': 1, 'max_people': 30, 'is_recommended': True, 'sort_order': 2,
                },
                {
                    'name': 'Platinum', 'price': 2000,
                    'inclusions': ['Gold inclusions', 'LED Light Box', 'Fog Machine Entry Effect'],
                    'duration_hours': 2, 'max_people': 50, 'sort_order': 3,
                },
                {
                    'name': 'Diamond', 'price': 2200,
                    'inclusions': ['Platinum inclusions', 'LED Letters (Name)'],
                    'duration_hours': 2, 'max_people': 75, 'sort_order': 4,
                },
                {
                    'name': 'Royal', 'price': 2500,
                    'inclusions': ['Diamond inclusions', 'Couple Entry with Smoke Effect', 'Floating Balloons'],
                    'duration_hours': 3, 'max_people': 100, 'sort_order': 5,
                },
                {
                    'name': 'Imperial', 'price': 3000,
                    'inclusions': ['Royal inclusions', 'Photography + Videography (1hr)', 'Custom LED Name Board'],
                    'duration_hours': 3, 'max_people': 150, 'sort_order': 6,
                },
            ]
            for pkg in PACKAGES:
                Package.objects.create(
                    hall=hall,
                    name=pkg['name'],
                    price=pkg['price'],
                    duration_hours=pkg.get('duration_hours', 1),
                    max_people=pkg.get('max_people', 20),
                    inclusions=pkg['inclusions'],
                    is_recommended=pkg.get('is_recommended', False),
                    sort_order=pkg.get('sort_order', 0),
                )
            print(f"    Added 6 canonical packages to {hall.name}")

        # 4. Add a dummy image URL if none exist
        if not hall.images.exists():
            HallImage.objects.create(
                hall=hall,
                url='https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80',
                is_primary=True,
                caption='Main Hall View'
            )

        # 5. Add canonical AddonServices
        if not hall.addon_services.exists():
            ADDONS = [
                {'name': 'Professional Photography (1hr)', 'price': 1500, 'cat': 'photography'},
                {'name': 'HD Videography (1hr)', 'price': 2500, 'cat': 'photography'},
                {'name': 'Standard Buffet (Per Plate)', 'price': 350, 'cat': 'food'},
                {'name': 'Premium Buffet (Per Plate)', 'price': 550, 'cat': 'food'},
                {'name': 'Themed Decoration', 'price': 4000, 'cat': 'decoration'},
                {'name': 'Entry Fog Machine', 'price': 1000, 'cat': 'entry_effect'},
            ]
            for ad in ADDONS:
                AddonService.objects.create(
                    hall=hall, name=ad['name'], price=ad['price'], category=ad['cat']
                )
            print(f"    Added {len(ADDONS)} addon services to {hall.name}")

        # 6. Create default slots for next 30 days
        from bookings.models import Slot
        from datetime import time
        today = date.today()
        created_slots_count = 0
        
        for i in range(30):
            day = today + timedelta(days=i)
            # Create Morning Slot (9 AM - 2 PM)
            s1, created1 = Slot.objects.get_or_create(
                hall=hall, date=day, start_time=time(9, 0),
                defaults={'end_time': time(14, 0), 'status': 'available'}
            )
            # Create Evening Slot (4 PM - 9 PM)
            s2, created2 = Slot.objects.get_or_create(
                hall=hall, date=day, start_time=time(16, 0),
                defaults={'end_time': time(21, 0), 'status': 'available'}
            )
            if created1: created_slots_count += 1
            if created2: created_slots_count += 1
        
        if created_slots_count > 0:
            print(f"    Added {created_slots_count} availability slots to {hall.name}")

    print("\nSeed Complete! Halls in DB:", PartyHall.objects.count())

if __name__ == "__main__":
    seed()
