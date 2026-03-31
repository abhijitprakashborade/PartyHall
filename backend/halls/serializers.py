from rest_framework import serializers
from .models import PartyHall, HallImage, Package, AddonService
import pgeocode


class HallImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = HallImage
        fields = ['id', 'url', 'image', 'caption', 'is_primary', 'sort_order']

    def get_image(self, obj):
        if not obj.image:
            # If it's a URL-based image, ensure it's absolute if it's a relative path
            if obj.url and obj.url.startswith('/media/'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.url)
                return f"http://localhost:8000{obj.url}"
            return obj.url

        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        
        # Fallback for Windows/Local Dev if request context is missing
        return f"http://localhost:8000{obj.image.url}"


class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = '__all__'


class AddonServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddonService
        fields = '__all__'


class PartyHallListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    partner_name = serializers.CharField(source='partner.full_name', read_only=True)
    partner_email = serializers.CharField(source='partner.email', read_only=True)
    distance_km = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    # Include full images + addons so the partner edit form loads existing data
    images = HallImageSerializer(many=True, read_only=True)
    addon_services = AddonServiceSerializer(many=True, read_only=True)

    class Meta:
        model = PartyHall
        fields = [
            'id', 'name', 'slug', 'city', 'pincode', 'address',
            'capacity_min', 'capacity_max', 'base_capacity',
            'price_per_slot', 'hourly_rate', 'extra_guest_fee',
            # Partner-configurable pricing rates
            'gap_fee_per_hour', 'multi_slot_discount_pct', 'extra_guest_fee_per_head',
            'rating_avg', 'total_reviews', 'is_featured',
            'status', 'is_active',
            'primary_image', 'partner_name', 'partner_email', 'distance_km',
            'amenity_ac', 'amenity_parking', 'amenity_projector',
            'latitude', 'longitude', 'instant_confirmation',
            'opening_time', 'closing_time',
            'created_at',
            # Needed by partner edit form
            'images', 'addon_services',
        ]

    def get_latitude(self, obj):
        return obj.latitude

    def get_longitude(self, obj):
        return obj.longitude

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if not img:
            return None

        # Prefer uploaded file — but only if it actually exists on disk
        if img.image:
            import os
            if os.path.isfile(img.image.path):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(img.image.url)
                return f"http://localhost:8000{img.image.url}"
            # File record in DB but file missing from disk — fall through to url

        # External URL fallback
        url = img.url or ''
        if not url:
            return None
        if url.startswith('/media/'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            return f"http://localhost:8000{url}"
        return url

    def get_distance_km(self, obj):
        return self.context.get('distances', {}).get(str(obj.id))


class PartyHallDetailSerializer(serializers.ModelSerializer):
    images = HallImageSerializer(many=True, read_only=True)
    # ✅ Only return ACTIVE packages and addons to users
    packages = serializers.SerializerMethodField()
    addon_services = serializers.SerializerMethodField()
    partner_name = serializers.CharField(source='partner.full_name', read_only=True)
    partner_phone = serializers.CharField(source='partner.phone', read_only=True)

    class Meta:
        model = PartyHall
        fields = '__all__'
        extra_fields = ['latitude', 'longitude']

    def get_packages(self, obj):
        """Return only active packages, sorted by price ascending."""
        qs = obj.packages.filter(is_active=True).order_by('sort_order', 'price')
        return PackageSerializer(qs, many=True).data

    def get_addon_services(self, obj):
        """Return all addon services for this hall (partners control visibility via is_active)."""
        qs = obj.addon_services.filter(is_active=True) if hasattr(obj.addon_services.model, 'is_active') else obj.addon_services.all()
        return AddonServiceSerializer(qs, many=True).data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Coordinates are already part of fields, but if they were excluded or renamed:
        ret['latitude'] = float(instance.latitude) if instance.latitude else None
        ret['longitude'] = float(instance.longitude) if instance.longitude else None
        return ret


class PartyHallWriteSerializer(serializers.ModelSerializer):
    state = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = PartyHall
        exclude = ['partner', 'slug', 'status', 'is_active', 'rating_avg', 'total_reviews', 'trending_score']

    def create(self, validated_data):
        validated_data['partner'] = self.context['request'].user
        hall = super().create(validated_data)
        self._resolve_pincode(hall)
        return hall

    def update(self, instance, validated_data):
        hall = super().update(instance, validated_data)
        if 'pincode' in validated_data:
            self._resolve_pincode(hall)
        return hall

    def _resolve_pincode(self, hall):
        """Resolve pincode to lat/lng using pgeocode and store as Point."""
        import math
        try:
            nomi = pgeocode.Nominatim('in')
            loc = nomi.query_postal_code(hall.pincode)
            if loc is not None and not loc.empty:
                lat = float(loc.latitude)
                lng = float(loc.longitude)
                # pgeocode returns NaN for unknown pincodes — skip storing them
                if not math.isnan(lat) and not math.isnan(lng):
                    hall.latitude = lat
                    hall.longitude = lng
                    hall.save(update_fields=['latitude', 'longitude'])
        except Exception:
            pass
