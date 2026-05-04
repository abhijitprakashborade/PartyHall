from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
import pgeocode

from .models import PartyHall, Package, AddonService
from .serializers import (
    PartyHallListSerializer, PartyHallDetailSerializer,
    PartyHallWriteSerializer, PackageSerializer, AddonServiceSerializer
)


class HallViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'list':
            return PartyHallListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return PartyHallWriteSerializer
        return PartyHallDetailSerializer

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        
        # Base query with optimization
        qs = PartyHall.objects.select_related('partner', 'partner__subscription').prefetch_related('images', 'packages', 'addon_services')

        # Admin sees everything
        if user.is_authenticated and user.is_admin:
            return qs.all()

        # Partner sees ONLY their own halls — all statuses (pending, approved, rejected)
        # The public /halls listing uses the unauthenticated queryset path below.
        # Partners should NEVER see or be able to act on another partner's hall.
        if user.is_authenticated and user.is_partner:
            return qs.filter(partner=user)

        # Public: only approved+active halls where partner has a valid subscription
        # Use OR to handle both: has-valid-sub AND (rare) no-sub-record-yet edge case
        valid_sub_q = (
            Q(partner__subscription__status__in=['active', 'trial']) &
            Q(partner__subscription__expires_at__gt=now)
        )
        return qs.filter(
            Q(status='approved', is_active=True) & valid_sub_q
        )


    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # Attach distance map for list view (pincode search)
        ctx['distances'] = getattr(self, '_distances', {})
        return ctx

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()

        # Filter: city
        city = request.query_params.get('city')
        if city:
            qs = qs.filter(city__icontains=city)

        # Filter: capacity
        capacity = request.query_params.get('capacity')
        if capacity:
            qs = qs.filter(capacity_min__lte=capacity, capacity_max__gte=capacity)

        # Filter: max_price
        max_price = request.query_params.get('max_price')
        if max_price:
            qs = qs.filter(price_per_slot__lte=max_price)

        # Geo search (Simplified for Windows)
        distances = {}
        pincode = request.query_params.get('pincode')
        
        if pincode:
            # For now, just filter by pincode prefix or exact match
            # In a full-scale app without PostGIS, we'd use Haversine formula in Python or JS
            qs = qs.filter(pincode=pincode)

        self._distances = distances

        # Sort
        sort = request.query_params.get('sort', 'trending')
        if sort == 'price_asc':
            qs = qs.order_by('price_per_slot')
        elif sort == 'price_desc':
            qs = qs.order_by('-price_per_slot')
        elif sort == 'rating':
            qs = qs.order_by('-rating_avg')
        else:
            qs = qs.order_by('-is_featured', '-trending_score')

        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        # ── Hall creation limit gate ──────────────────────────────────────────
        if not user.is_admin:
            from subscriptions.models import Subscription
            from rest_framework.exceptions import PermissionDenied
            hall_limit = 1  # default for trial / no sub
            try:
                sub = Subscription.objects.select_related('plan').get(partner=user)
                if sub.is_valid and sub.plan and not sub.is_trial:
                    hall_limit = sub.plan.hall_limit
                elif not sub.is_valid:
                    raise PermissionDenied(
                        'subscription_required: Your subscription has expired. Please renew to create halls.'
                    )
            except Subscription.DoesNotExist:
                pass  # allow 1 hall (trial will be started on publish)

            existing_count = PartyHall.objects.filter(partner=user).count()
            if existing_count >= hall_limit:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'error': 'hall_limit_reached',
                    'message': (
                        f'Your current plan allows {hall_limit} hall(s). '
                        f'You already have {existing_count}. '
                        'Upgrade your plan to create more halls.'
                    ),
                    'hall_limit': hall_limit,
                    'hall_count': existing_count,
                })
        serializer.save(partner=user)

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to log validation errors for debugging."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if not serializer.is_valid():
            import logging
            logger = logging.getLogger(__name__)
            logger.error("Hall PATCH validation errors: %s", serializer.errors)
            print("DEBUG PATCH ERRORS:", serializer.errors)  # visible in dev server
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated], url_path='my-hall')
    def my_hall(self, request):
        """
        GET  /halls/my-hall/  — Return the authenticated partner's first hall.
        PATCH /halls/my-hall/ — Partially update their hall (pricing rates etc.).
        """
        try:
            hall = PartyHall.objects.get(partner=request.user)
        except PartyHall.DoesNotExist:
            return Response({'error': 'You do not have a hall yet.'}, status=404)
        except PartyHall.MultipleObjectsReturned:
            hall = PartyHall.objects.filter(partner=request.user).first()

        if request.method == 'GET':
            from .serializers import PartyHallDetailSerializer
            return Response(PartyHallDetailSerializer(hall, context={'request': request}).data)

        # PATCH — only allow pricing-rate fields (safe subset)
        ALLOWED_FIELDS = {
            'gap_fee_per_hour',
            'multi_slot_discount_pct',
            'extra_guest_fee_per_head',
            # also allow basic settings editable from other partner pages
            'opening_time', 'closing_time',
            'instant_confirmation',
            'min_advance_booking_days', 'max_advance_booking_days',
            'refund_percentage_3h', 'refund_percentage_2h', 'refund_percentage_1h',
        }
        payload = {k: v for k, v in request.data.items() if k in ALLOWED_FIELDS}
        from .serializers import PartyHallWriteSerializer
        s = PartyHallWriteSerializer(hall, data=payload, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=400)
        s.save()
        # Return fresh detail data
        from .serializers import PartyHallDetailSerializer
        return Response(PartyHallDetailSerializer(hall, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='add_image')
    def add_image(self, request, slug=None):
        """Partner: add an image URL to their hall."""
        hall = self.get_object()
        # Ensure only the owner or admin can add images
        # Check subscription
        if not request.user.is_admin:
            from subscriptions.models import Subscription
            try:
                sub = Subscription.objects.get(partner=request.user)
                if not sub.is_valid:
                    return Response({'error': 'Subscription inactive. Please renew to manage images.'}, status=402)
            except Subscription.DoesNotExist:
                return Response({'error': 'Subscription required'}, status=402)
            
        if not request.user.is_admin and hall.partner != request.user:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        url = request.data.get('url', '').strip()
        image_file = request.FILES.get('image')
        
        if not url and not image_file:
            return Response({'error': 'Image URL or file is required'}, status=400)

        from .models import HallImage
        from .serializers import HallImageSerializer

        is_primary = request.data.get('is_primary') in [True, 'true', '1']
        caption = request.data.get('caption', '')

        # If setting as primary, unset existing primary
        if is_primary:
            HallImage.objects.filter(hall=hall, is_primary=True).update(is_primary=False)

        image = HallImage.objects.create(
            hall=hall,
            url=url if url else None,
            image=image_file if image_file else None,
            caption=caption,
            is_primary=is_primary or not hall.images.exists(),
            sort_order=hall.images.count(),
        )
        return Response(HallImageSerializer(image, context={'request': request}).data, status=201)

    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated], url_path='delete_image/(?P<image_id>[^/.]+)')
    def delete_image(self, request, slug=None, image_id=None):
        """Partner: delete an image from their hall."""
        hall = self.get_object()
        # Check subscription
        if not request.user.is_admin:
            from subscriptions.models import Subscription
            try:
                sub = Subscription.objects.get(partner=request.user)
                if not sub.is_valid:
                    return Response({'error': 'Subscription inactive.'}, status=402)
            except Subscription.DoesNotExist:
                return Response({'error': 'Subscription required'}, status=402)

        if not request.user.is_admin and hall.partner != request.user:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        from .models import HallImage
        try:
            image = HallImage.objects.get(id=image_id, hall=hall)
            image.delete()
            # If the deleted one was primary, promote the next remaining image.
            # Use queryset .update() to avoid "did not affect any rows" DatabaseError
            # that occurs when saving a stale in-memory instance after a delete.
            if not hall.images.filter(is_primary=True).exists():
                first = hall.images.first()
                if first:
                    hall.images.filter(pk=first.pk).update(is_primary=True)
            return Response({'message': 'Image deleted'}, status=204)
        except HallImage.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='set_primary/(?P<image_id>[^/.]+)')
    def set_primary(self, request, slug=None, image_id=None):
        """Partner: set an image as primary (cover) for their hall."""
        hall = self.get_object()
        # Check subscription
        if not request.user.is_admin:
            from subscriptions.models import Subscription
            try:
                sub = Subscription.objects.get(partner=request.user)
                if not sub.is_valid:
                    return Response({'error': 'Subscription inactive.'}, status=402)
            except Subscription.DoesNotExist:
                return Response({'error': 'Subscription required'}, status=402)

        if not request.user.is_admin and hall.partner != request.user:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        from .models import HallImage
        try:
            image = HallImage.objects.get(id=image_id, hall=hall)
            HallImage.objects.filter(hall=hall, is_primary=True).update(is_primary=False)
            image.is_primary = True
            image.save(update_fields=['is_primary'])
            return Response({'message': 'Cover photo updated'})
        except HallImage.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, slug=None):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)
        hall = self.get_object()
        hall.status = 'approved'
        hall.is_active = True
        hall.save()
        self._log(request.user, 'hall_approved', 'party_hall', hall.id)
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, slug=None):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)
        hall = self.get_object()
        hall.status = 'rejected'
        hall.is_active = False
        hall.rejection_reason = request.data.get('reason', '')
        hall.save()
        self._log(request.user, 'hall_rejected', 'party_hall', hall.id, {'reason': hall.rejection_reason})
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='publish')
    def publish(self, request, slug=None):
        """
        Partner publishes a hall. Requires either:
        a) An active paid subscription, or
        b) Their one unused 1-hour free trial.

        Only 1 hall can be published (approved+active) at a time.
        Admin cannot publish halls — only the owning partner can.
        """
        hall = self.get_object()

        # ✅ Admin CANNOT approve/publish halls — only the partner who owns the hall can
        if request.user.is_admin:
            return Response(
                {'error': 'Admins cannot publish halls. Only the partner who owns the hall can publish it.'},
                status=403
            )

        if hall.partner != request.user:
            return Response({'error': 'Unauthorized'}, status=403)

        # --- Subscription gate ---
        from subscriptions.models import Subscription
        from django.utils import timezone

        sub = None
        try:
            sub = Subscription.objects.get(partner=request.user)
            # Lazy expiry
            now = timezone.now()
            if sub.status in ('active', 'trial') and sub.expires_at <= now:
                sub.status = 'expired'
                sub.save(update_fields=['status', 'updated_at'])
                sub.refresh_from_db()
        except Subscription.DoesNotExist:
            pass

        has_active_sub = sub and sub.is_valid
        trial_available = not sub or not sub.trial_used

        if not has_active_sub and not trial_available:
            return Response({
                'error': 'subscription_required',
                'message': 'Your free trial has been used and you have no active subscription. Please subscribe to publish halls.',
            }, status=402)

        # If no active sub but trial available — auto-start trial
        if not has_active_sub and trial_available:
            from subscriptions.views import StartTrialView
            trial_resp = StartTrialView().post(request)
            if trial_resp.status_code != 200:
                return trial_resp
            # Re-fetch sub
            sub = Subscription.objects.get(partner=request.user)

        # --- Dynamic Hall Limit ---
        plan_limit = sub.plan.hall_limit if (sub and sub.plan and not sub.is_trial) else 1

        already_published = PartyHall.objects.filter(
            partner=request.user,
            status='approved',
            is_active=True,
        ).exclude(id=hall.id).count()

        if already_published >= plan_limit:
            return Response({
                'error': 'hall_limit_reached',
                'message': f'You have reached the limit of {plan_limit} published hall(s) for your current plan. Unpublish another hall or upgrade to add more.',
            }, status=400)

        hall.status = 'approved'
        hall.is_active = True
        hall.save(update_fields=['status', 'is_active'])
        self._log(request.user, 'hall_published', 'party_hall', hall.id, {'plan': str(sub.plan_id) if sub and sub.plan_id else 'trial'})
        return Response({'status': 'approved', 'message': 'Hall published successfully!'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='unpublish')
    def unpublish(self, request, slug=None):
        """Partner unpublishes (takes offline) a hall without losing data."""
        hall = self.get_object()
        if not request.user.is_admin and hall.partner != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        hall.status = 'pending'
        hall.is_active = False
        hall.save(update_fields=['status', 'is_active'])
        self._log(request.user, 'hall_unpublished', 'party_hall', hall.id)
        return Response({'status': 'pending', 'message': 'Hall taken offline.'})

    def _log(self, admin, action, entity_type, entity_id, metadata=None):
        from subscriptions.models import AdminLog
        AdminLog.objects.create(
            admin=admin, action=action,
            entity_type=entity_type, entity_id=entity_id,
            metadata=metadata or {}
        )


class PackageViewSet(viewsets.ModelViewSet):
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        # hall_id comes from ?hall_id= query param (flat router, not nested)
        hall_id = self.request.query_params.get('hall_id') or self.kwargs.get('hall_pk')

        # Admin: Everything
        if user.is_authenticated and user.is_admin:
            qs = Package.objects.all()
            if hall_id:
                qs = qs.filter(hall_id=hall_id)
            return qs

        # Partner: All packages for their own halls (including inactive, for management)
        if user.is_authenticated and user.is_partner:
            qs = Package.objects.filter(hall__partner=user)
            if hall_id:
                qs = qs.filter(hall_id=hall_id)
            return qs

        # Public / logged-in customer: Only ACTIVE packages
        # ✅ FIX: was using self.kwargs.get('hall_pk') which is always None for flat routes
        qs = Package.objects.filter(is_active=True)
        if hall_id:
            qs = qs.filter(hall_id=hall_id)
        return qs

    def perform_create(self, serializer):
        hall = serializer.validated_data.get('hall')
        if not self.request.user.is_admin and hall.partner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not own this hall.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='clone-to-halls')
    def clone_to_halls(self, request, pk=None):
        """
        Clone this package to one or more other halls owned by the same partner.
        POST body: { "hall_ids": ["uuid1", "uuid2", ...] }
        Skips halls where a package with the same name already exists.
        """
        from rest_framework.exceptions import PermissionDenied, ValidationError

        pkg = self.get_object()
        user = request.user

        # Only partners and admins can clone
        if not (user.is_partner or user.is_admin):
            raise PermissionDenied("Only partners can clone packages.")

        # Partner must own the source package's hall
        # Partner must own the source package's hall and have active sub
        if user.is_partner:
            from subscriptions.models import Subscription
            try:
                sub = Subscription.objects.get(partner=user)
                if not sub.is_valid:
                    return Response({'error': 'Active subscription required to clone packages.'}, status=402)
            except Subscription.DoesNotExist:
                return Response({'error': 'Subscription required'}, status=402)

            if pkg.hall.partner != user:
                raise PermissionDenied("You do not own this package.")

        hall_ids = request.data.get('hall_ids', [])
        if not hall_ids:
            raise ValidationError({'hall_ids': 'At least one target hall is required.'})

        # Validate all target halls belong to this partner
        target_halls = PartyHall.objects.filter(id__in=hall_ids)
        if user.is_partner:
            target_halls = target_halls.filter(partner=user)

        created = []
        skipped = []
        not_published = []  # halls that got the package but aren't live for users yet

        for hall in target_halls:
            # Skip if a package with the same name already exists in this hall
            if Package.objects.filter(hall=hall, name__iexact=pkg.name).exists():
                skipped.append(hall.name)
                continue

            Package.objects.create(
                hall=hall,
                name=pkg.name,
                price=pkg.price,
                duration_hours=pkg.duration_hours,
                max_people=pkg.max_people,
                inclusions=list(pkg.inclusions),
                is_recommended=pkg.is_recommended,
                is_active=pkg.is_active,
                sort_order=pkg.sort_order,
                description=pkg.description,
            )
            created.append(hall.name)

            # Warn if the target hall is not yet live for users
            if not (hall.status == 'approved' and hall.is_active):
                not_published.append(hall.name)

        return Response({
            'message': f'Package cloned to {len(created)} hall(s).',
            'created': created,
            'skipped': skipped,
            'not_published': not_published,  # halls that need to be published to be visible
        }, status=status.HTTP_200_OK)


class AddonServiceViewSet(viewsets.ModelViewSet):
    serializer_class = AddonServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        hall_id = self.request.query_params.get('hall_id')
        
        # Public: Only for specific hall
        if not user.is_authenticated:
            if hall_id:
                return AddonService.objects.filter(hall_id=hall_id)
            return AddonService.objects.none()

        # Admin: Everything
        if user.is_authenticated and user.is_admin:
            if hall_id:
                return AddonService.objects.filter(hall_id=hall_id)
            return AddonService.objects.all()

        # Partner: Own halls
        if user.is_authenticated and user.is_partner:
            if hall_id:
                return AddonService.objects.filter(hall_id=hall_id, hall__partner=user)
            return AddonService.objects.filter(hall__partner=user)

        return AddonService.objects.all()

    def perform_create(self, serializer):
        hall = serializer.validated_data.get('hall')
        user = self.request.user
        
        if not user.is_admin:
            from subscriptions.models import Subscription
            try:
                sub = Subscription.objects.get(partner=user)
                if not sub.is_valid:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("Active subscription required to create addon services.")
            except Subscription.DoesNotExist:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Subscription required.")

            if hall.partner != user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not own this hall.")
        serializer.save()
