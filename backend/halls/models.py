from django.db import models
from django.conf import settings
import uuid


class PartyHall(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
        ('subscription_expired', 'Subscription Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='halls')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    short_code = models.CharField(max_length=10, blank=True, null=True, help_text="Unique 3-4 letter code for booking references")
    description = models.TextField(blank=True)

    # Hall type & tags
    hall_type = models.CharField(max_length=50, blank=True, default='', help_text="e.g. banquet, conference, outdoor")
    tags = models.JSONField(default=list, blank=True, help_text="List of searchable tags e.g. ['Birthday', 'Corporate']")

    # Special instructions
    special_instructions = models.TextField(blank=True, help_text="Noise policy, parking info, entry requirements etc.")

    # Location
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, default='Tamil Nadu')
    pincode = models.CharField(max_length=6)
    
    # Numeric coordinates for Windows compatibility (removes GDAL requirement)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Capacity & Pricing
    capacity_min = models.PositiveIntegerField(default=1)
    base_capacity = models.PositiveIntegerField(default=10, help_text="Guest count included in base price")
    capacity_max = models.PositiveIntegerField(default=50)
    
    price_per_slot = models.DecimalField(max_digits=10, decimal_places=2, default=1000, help_text="Legacy: fixed slot price")
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=500, help_text="Price per hour for dynamic duration")
    extra_guest_fee = models.DecimalField(max_digits=10, decimal_places=2, default=500, help_text="Fee per guest above base_capacity")

    # ── Partner-Configurable Pricing Rates ─────────────────────────────────────
    gap_fee_per_hour = models.DecimalField(
        max_digits=8, decimal_places=2, default=200,
        help_text="Holding fee (₹) per hour of gap between non-consecutive slots"
    )
    multi_slot_discount_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        help_text="Discount % applied to package subtotal when >1 slot is booked (e.g. 10 = 10%)"
    )
    extra_guest_fee_per_head = models.DecimalField(
        max_digits=8, decimal_places=2, default=500,
        help_text="Fee (₹) per guest beyond the package max_people capacity"
    )

    # Advance booking window
    min_advance_booking_days = models.PositiveIntegerField(default=1, help_text="Minimum days in advance a booking can be made")
    max_advance_booking_days = models.PositiveIntegerField(default=90, help_text="Maximum days in advance a booking can be made")

    # Status & Visibility
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    is_active = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    trending_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews = models.PositiveIntegerField(default=0)

    # Base Amenities (Hardcoded Premium)
    amenity_projector = models.BooleanField(default=True, help_text="Full HD Projector")
    amenity_sound_system = models.BooleanField(default=True, help_text="Sony Dolby Atmos")
    amenity_wifi = models.BooleanField(default=True)
    amenity_decoration = models.BooleanField(default=True)
    amenity_ac = models.BooleanField(default=False)
    amenity_parking = models.BooleanField(default=False)
    amenity_led_letters = models.BooleanField(default=False)
    amenity_fog_machine = models.BooleanField(default=False)

    # Cancellation policy
    refund_percentage_3h = models.PositiveIntegerField(default=50)
    refund_percentage_2h = models.PositiveIntegerField(default=25)
    refund_percentage_1h = models.PositiveIntegerField(default=0)

    # Instant confirmation toggle
    instant_confirmation = models.BooleanField(default=True)

    # Operating Hours
    opening_time = models.TimeField(default='09:00', help_text="Hall opening time (e.g. 09:00)")
    closing_time = models.TimeField(default='20:00', help_text="Hall closing time (e.g. 20:00)")

    # Admin
    admin_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'party_halls'
        ordering = ['-trending_score', '-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import random, string
            self.slug = slugify(self.name) + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        
        if not self.short_code:
            # Generate short_code from name (e.g. "Grand Celebration" -> "GCH")
            clean_name = ''.join(c for c in self.name if c.isalnum()).upper()
            self.short_code = clean_name[:3]
            # Ensure uniqueness if needed
            if PartyHall.objects.filter(short_code=self.short_code).exists():
                import random, string
                self.short_code = clean_name[:2] + ''.join(random.choices(string.ascii_uppercase, k=2))
        
        super().save(*args, **kwargs)


class HallImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hall = models.ForeignKey(PartyHall, on_delete=models.CASCADE, related_name='images')
    url = models.URLField(blank=True, null=True)
    image = models.ImageField(upload_to='halls/images/', blank=True, null=True)
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'party_hall_images'
        ordering = ['sort_order']


class Package(models.Model):
    DURATION_MODE_CHOICES = [
        ('by_slots', 'By Slots'),
        ('fixed_hours', 'Fixed Hours'),
        ('open_ended', 'Open-Ended'),
    ]
    VISIBILITY_CHOICES = [
        ('public', 'Public'),
        ('members_only', 'Members Only'),
        ('hidden', 'Hidden'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hall = models.ForeignKey(PartyHall, on_delete=models.CASCADE, related_name='packages')
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_hours = models.PositiveIntegerField(default=1)
    max_people = models.PositiveIntegerField(default=10)
    inclusions = models.JSONField(default=list)
    is_recommended = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)

    # Appearance
    badge_color = models.CharField(max_length=7, default='#7C3AED')

    # Tiered guest pricing
    guest_tiers = models.JSONField(default=list, blank=True,
        help_text='[{"min": 1, "max": 10, "price": 1200}, ...]')

    # Duration configuration
    duration_mode = models.CharField(
        max_length=20, choices=DURATION_MODE_CHOICES, default='by_slots')
    min_slots = models.IntegerField(null=True, blank=True,
        help_text='Minimum slots customer must book (by_slots mode)')
    fixed_hours = models.FloatField(null=True, blank=True,
        help_text='Exact hours covered (fixed_hours mode)')
    overtime_rate = models.IntegerField(null=True, blank=True,
        help_text='₹ per hour beyond fixed duration')
    price_per_hour = models.IntegerField(null=True, blank=True,
        help_text='₹ per hour (open_ended mode)')
    max_hours = models.IntegerField(null=True, blank=True,
        help_text='Maximum allowed hours (open_ended mode)')

    # Visibility & booking rules
    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default='public')
    advance_booking_required = models.BooleanField(default=True)
    allow_extra_guests = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'packages'
        ordering = ['sort_order', 'price']

    def __str__(self):
        return f'{self.hall.name} — {self.name} (₹{self.price})'


class AddonService(models.Model):
    CATEGORY_CHOICES = [
        ('photography', 'Photography'),
        ('food', 'Food & Drinks (Buffet)'),
        ('decoration', 'Premium Decoration'),
        ('entry_effect', 'Entry Effect'),
        ('other', 'Other Services'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hall = models.ForeignKey(PartyHall, on_delete=models.CASCADE, related_name='addon_services')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'addon_services'
        ordering = ['category', 'sort_order']

    def __str__(self):
        return f'{self.name} — ₹{self.price} ({self.get_category_display()})'


# ─── Default Package Signal ────────────────────────────────────────────────────

DEFAULT_PACKAGES = [
    {
        'name': 'Silver',
        'price': 1000,
        'duration_hours': 1,
        'max_people': 20,
        'is_recommended': False,
        'sort_order': 1,
        'inclusions': [
            'Grandeur Decoration',
            'Sony Dolby Atmos Sound',
            'Full HD Projector',
            'Welcome Drinks',
        ],
    },
    {
        'name': 'Gold',
        'price': 1500,
        'duration_hours': 1,
        'max_people': 30,
        'is_recommended': True,
        'sort_order': 2,
        'inclusions': [
            'Silver inclusions',
            'Cool Cake (1kg)',
            "Photo Frame (10\u00d715')",
        ],
    },
    {
        'name': 'Platinum',
        'price': 2000,
        'duration_hours': 2,
        'max_people': 50,
        'is_recommended': False,
        'sort_order': 3,
        'inclusions': [
            'Gold inclusions',
            'Photographer (1h)',
            'Fog Machine Entry',
        ],
    },
]


from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=PartyHall)
def create_default_packages(sender, instance, created, **kwargs):
    """Auto-create 3 default packages for every new hall."""
    if not created:
        return
    # Only seed if no packages exist yet
    if instance.packages.exists():
        return
    for pkg in DEFAULT_PACKAGES:
        Package.objects.create(hall=instance, **pkg)
