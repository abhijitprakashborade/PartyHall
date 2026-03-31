from rest_framework import serializers
from .models import Slot, Booking, BookingAddon
from halls.serializers import PackageSerializer, AddonServiceSerializer
from accounts.serializers import UserSerializer


class HallMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        from halls.models import PartyHall
        model = PartyHall
        fields = ['name', 'city']


class PackageMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        from halls.models import Package
        model = Package
        fields = ['name', 'price', 'inclusions']


class SlotSerializer(serializers.ModelSerializer):
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = Slot
        fields = ['id', 'date', 'start_time', 'end_time', 'status', 'locked_until', 'is_available']

    def get_is_available(self, obj):
        return obj.is_available()


class BookingAddonSerializer(serializers.ModelSerializer):
    addon_name = serializers.CharField(source='addon.name', read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = BookingAddon
        fields = ['id', 'addon', 'addon_name', 'quantity', 'unit_price', 'total_price']


class BookingSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    hall = HallMinimalSerializer(read_only=True)
    package = PackageMinimalSerializer(read_only=True)
    booking_addons = BookingAddonSerializer(many=True, read_only=True)

    # Legacy flat fields for backward compatibility if any
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    hall_name = serializers.CharField(source='hall.name', read_only=True)
    hall_id = serializers.UUIDField(source='hall.id', read_only=True)  # needed for review submission
    package_name = serializers.CharField(source='package.name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_ref', 'hall', 'hall_name', 'hall_id', 'customer', 'customer_name',
            'customer_phone', 'slot', 'package', 'package_name',
            'base_amount', 'addons_amount', 'total_amount', 'status',
            'guest_count', 'special_notes', 'qr_code_token',
            'slot_date', 'slot_start_time', 'slot_end_time',
            'cancellation_reason', 'refund_amount', 'refund_status',
            'checked_in_at', 'checked_out_at',
            'is_reviewed', 'booking_addons', 'created_at',
        ]
        read_only_fields = ['id', 'booking_ref', 'qr_code_token', 'created_at']


class CreateBookingSerializer(serializers.Serializer):
    hall_id = serializers.UUIDField()
    # slot_ids: all selected slots (supports non-contiguous e.g. 9-10 AM + 3-4 PM)
    # slot_id (legacy): kept for backward compat — ignored if slot_ids is provided
    slot_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    slot_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    package_id = serializers.UUIDField()
    addon_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    addon_quantities = serializers.JSONField(required=False, default=dict)
    guest_count = serializers.IntegerField(min_value=1, default=10)
    special_notes = serializers.CharField(required=False, allow_blank=True, default='')
    slot_start_time = serializers.TimeField(required=False, allow_null=True, default=None)
    slot_end_time = serializers.TimeField(required=False, allow_null=True, default=None)
    # Total hours override for non-contiguous slots (e.g. 9-10 + 3-4 = 2h, not 7h)
    duration_hours_override = serializers.FloatField(required=False, allow_null=True, default=None)
    same_event = serializers.BooleanField(required=False, default=True)

    def validate(self, data):
        from .models import Slot
        from django.utils import timezone
        from datetime import timedelta

        # Resolve which slot IDs to use
        slot_ids = data.get('slot_ids') or (
            [data['slot_id']] if data.get('slot_id') else []
        )
        if not slot_ids:
            raise serializers.ValidationError("At least one slot_id is required.")
        data['slot_ids'] = slot_ids

        try:
            first_slot = Slot.objects.get(pk=slot_ids[0])
            min_date = (timezone.now() + timedelta(days=7)).date()
            if first_slot.date < min_date:
                raise serializers.ValidationError(
                    f"Bookings must be made at least 7 days in advance. "
                    f"The earliest available booking date is {min_date.strftime('%d %b %Y')}."
                )
        except Slot.DoesNotExist:
            raise serializers.ValidationError("Slot not found.")
        return data
