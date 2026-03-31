from django.db import models
from django.conf import settings
import uuid, random, string


def generate_booking_ref(hall):
    from django.utils import timezone
    if not hall: return f"PH-{timezone.now().year}-unknown"
    year = timezone.now().year
    prefix = getattr(hall, 'short_code', 'PH')
    suffix = ''.join(random.choices(string.digits, k=5))
    return f'{prefix}-{year}-{suffix}'


class Slot(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('locked', 'Locked'),
        ('booked', 'Booked'),
        ('blocked', 'Blocked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hall = models.ForeignKey('halls.PartyHall', on_delete=models.CASCADE, related_name='slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    locked_until = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='locked_slots')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'slots'
        unique_together = ['hall', 'date', 'start_time']
        ordering = ['date', 'start_time']

    def __str__(self):
        return f'{self.hall.name} — {self.date} {self.start_time}'

    def is_available(self):
        from django.utils import timezone
        if self.status == 'available':
            return True
        if self.status == 'locked' and self.locked_until and self.locked_until < timezone.now():
            return True
        return False


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_ref = models.CharField(max_length=20, unique=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='managed_bookings', null=True, blank=True)
    hall = models.ForeignKey('halls.PartyHall', on_delete=models.PROTECT, related_name='bookings')
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='bookings')
    slot = models.ForeignKey(Slot, on_delete=models.PROTECT, related_name='bookings', null=True, blank=True)
    package = models.ForeignKey('halls.Package', on_delete=models.PROTECT, related_name='bookings', null=True, blank=True)

    # Financials
    base_amount = models.DecimalField(max_digits=10, decimal_places=2)
    addons_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Booking status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    guest_count = models.PositiveIntegerField(default=10)
    special_notes = models.TextField(blank=True)

    # Cancellation
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Refund
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refund_status = models.CharField(max_length=20, blank=True)

    # Multi-slot support: all individual hourly slots in this booking
    # (supports non-contiguous selection, e.g. 9-10 AM and 3-4 PM)
    selected_slots = models.ManyToManyField(
        'Slot', blank=True, related_name='multi_bookings',
        help_text='All 1-hour slots included in this booking'
    )

    # QR / Check-in
    qr_code_token = models.CharField(max_length=64, unique=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    is_reviewed = models.BooleanField(default=False)
    reminder_sent = models.BooleanField(default=False)

    # Slot details (denormalized for quick display)
    slot_date = models.DateField(null=True, blank=True)
    slot_start_time = models.TimeField(null=True, blank=True)
    slot_end_time = models.TimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.booking_ref} — {self.customer.full_name}'

    def save(self, *args, **kwargs):
        if not self.owner and self.hall:
            self.owner = self.hall.partner
            
        if not self.booking_ref and self.hall:
            self.booking_ref = generate_booking_ref(self.hall)
            
        if not self.qr_code_token:
            import secrets
            self.qr_code_token = secrets.token_hex(32)
        super().save(*args, **kwargs)


class BookingAddon(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booking_addons')
    addon = models.ForeignKey('halls.AddonService', on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'booking_addons'

    @property
    def total_price(self):
        return self.quantity * self.unit_price
