import os
import django
import uuid

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from halls.models import PartyHall, Package, AddonService

def seed_tiers():
    halls = PartyHall.objects.all()
    if not halls.exists():
        print("No halls found. Please seed halls first.")
        return

    # Tiered Packages
    packages_data = [
        {'name': 'Silver', 'price': 1000, 'duration': 4, 'people': 50, 'recommended': False},
        {'name': 'Gold', 'price': 1500, 'duration': 4, 'people': 100, 'recommended': False},
        {'name': 'Platinum', 'price': 2000, 'duration': 6, 'people': 150, 'recommended': True},
        {'name': 'Diamond', 'price': 2200, 'duration': 6, 'people': 200, 'recommended': False},
        {'name': 'Royal', 'price': 2500, 'duration': 8, 'people': 250, 'recommended': False},
        {'name': 'Imperial', 'price': 3000, 'duration': 12, 'people': 500, 'recommended': False},
    ]

    # Tiered Photography Add-ons
    photography_data = [
        {'name': 'Photography Tier 1', 'price': 1000, 'description': 'Basic coverage (2 hours)'},
        {'name': 'Photography Tier 2', 'price': 2000, 'description': 'Standard coverage (4 hours) + Digital Album'},
        {'name': 'Photography Tier 3', 'price': 3000, 'description': 'Premium coverage (Full Event) + Physical Album'},
        {'name': 'Photography Tier 4', 'price': 4000, 'description': 'Cinematic coverage + Drone + Luxury Album'},
    ]

    for hall in halls:
        print(f"Seeding tiers for: {hall.name}")
        
        # Clear existing packages/addons for clean state if needed, 
        # but here we just ensure they exist.
        for p in packages_data:
            Package.objects.get_or_create(
                hall=hall,
                name=p['name'],
                defaults={
                    'price': p['price'],
                    'duration_hours': p['duration'],
                    'max_people': p['people'],
                    'is_recommended': p['recommended'],
                    'inclusions': ['Sony Dolby Atmos', 'Full HD Projector', 'Basic Decoration', 'Electricity Backup']
                }
            )

        for a in photography_data:
            AddonService.objects.get_or_create(
                hall=hall,
                name=a['name'],
                category='photography',
                defaults={
                    'price': a['price'],
                    'description': a['description']
                }
            )

    print("Seeding complete!")

if __name__ == '__main__':
    seed_tiers()
