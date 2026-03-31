import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from subscriptions.models import SubscriptionPlan

def seed_plans():
    plans = [
        {
            'name': 'Starter',
            'slug': 'starter',
            'price': 999,
            'hall_limit': 1,
            'has_advanced_analytics': False,
            'features': ['1 Hall Published', 'Basic Analytics', 'Email Support'],
        },
        {
            'name': 'Pro',
            'slug': 'pro',
            'price': 2499,
            'hall_limit': 3,
            'has_advanced_analytics': True,
            'features': ['3 Halls Published', 'Advanced Analytics', 'Priority Support', 'Custom Packages'],
        },
        {
            'name': 'Elite',
            'slug': 'elite',
            'price': 4999,
            'hall_limit': 10,
            'has_advanced_analytics': True,
            'features': ['10 Halls Published', 'Full Analytics', '24/7 Support', 'Priority Listing', 'Dedicated Manager'],
        },
    ]

    for p in plans:
        plan, created = SubscriptionPlan.objects.update_or_create(
            slug=p['slug'],
            defaults=p
        )
        if created:
            print(f"Created plan: {plan.name}")
        else:
            print(f"Updated plan: {plan.name}")

if __name__ == '__main__':
    seed_plans()
