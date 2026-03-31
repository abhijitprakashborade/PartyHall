from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid


class SubscriptionPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    hall_limit = models.PositiveIntegerField(default=1)
    has_advanced_analytics = models.BooleanField(default=False)
    features = models.JSONField(default=list, help_text="List of feature strings")
    default_duration_days = models.PositiveIntegerField(null=True, blank=True)
    fixed_expiry_date = models.DateTimeField(null=True, blank=True, help_text="Specific moment this plan template expires")
    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'

    def __str__(self):
        return f"{self.name} (₹{self.price})"


class Subscription(models.Model):
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('grace_period', 'Grace Period'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    
    # New ForeignKey to Plan
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='subscriptions')
    
    # Keep legacy plan slug for migration/compatibility
    legacy_plan_id = models.CharField(max_length=20, default='starter')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    started_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()

    # Trial tracking
    is_trial = models.BooleanField(default=False)
    trial_used = models.BooleanField(default=False)
    trial_started_at = models.DateTimeField(null=True, blank=True)

    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        plan_name = self.plan.name if self.plan else self.legacy_plan_id
        return f'{self.partner.full_name} — {plan_name} ({self.status})'

    @property
    def is_valid(self):
        now = timezone.now()
        if self.status in ('active', 'trial') and self.expires_at > now:
            return True
        # Also valid during the 3-day grace period after expiry (non-trial only)
        if self.status == 'grace_period' and self.is_in_grace_period:
            return True
        return False

    @property
    def is_in_grace_period(self):
        now = timezone.now()
        if self.is_trial:
            return False
        grace_end = self.expires_at + timedelta(days=3)
        return self.expires_at < now < grace_end

    @property
    def grace_end_date(self):
        return self.expires_at + timedelta(days=3)

    @property
    def days_remaining(self):
        """Days left on active plan (0 if expired/trial)."""
        now = timezone.now()
        if not self.is_valid:
            return 0
        delta = self.expires_at - now
        return max(0, delta.days)

    @property
    def can_change_plan(self):
        """Partner can only pick a new plan when current plan is expired/cancelled/none."""
        return self.status in ('expired', 'cancelled', 'trial') or not self.is_valid


class AdminLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_logs')
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admin_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} by {self.admin} on {self.entity_type}'


class SubscriptionPayment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH          = 'cash',          'Cash'
        UPI           = 'upi',           'UPI'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        CHEQUE        = 'cheque',        'Cheque'
        ONLINE        = 'online',        'Online'

    class PaymentSource(models.TextChoices):
        OFFLINE = 'offline', 'Offline (admin recorded)'
        ONLINE  = 'online',  'Online (payment gateway)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    partner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription_payments'
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH
    )
    source = models.CharField(
        max_length=10,
        choices=PaymentSource.choices,
        default=PaymentSource.OFFLINE
    )
    reference_id = models.CharField(max_length=200, blank=True)
    payment_date = models.DateField()
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.partner} — {self.method} — ₹{self.amount}"
