from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, generics, status, viewsets
from rest_framework.serializers import ModelSerializer, SerializerMethodField, ValidationError
from django.utils import timezone

from .models import Subscription, AdminLog, SubscriptionPlan, SubscriptionPayment


class SubscriptionPlanSerializer(ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'slug', 'price', 'hall_limit', 
            'has_advanced_analytics', 'features', 'default_duration_days', 
            'fixed_expiry_date', 'created_at'
        ]



class SubscriptionSerializer(ModelSerializer):
    is_valid = SerializerMethodField()
    is_in_grace_period = SerializerMethodField()
    grace_end_date = SerializerMethodField()
    days_remaining = SerializerMethodField()
    can_change_plan = SerializerMethodField()
    plan_info = SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'legacy_plan_id', 'status', 'started_at', 'expires_at',
            'is_trial', 'trial_used', 'trial_started_at',
            'is_valid', 'is_in_grace_period', 'grace_end_date',
            'days_remaining', 'can_change_plan', 'plan_info', 'created_at',
        ]
        read_only_fields = fields

    def get_is_valid(self, obj): return obj.is_valid
    def get_is_in_grace_period(self, obj): return obj.is_in_grace_period
    def get_grace_end_date(self, obj): return str(obj.grace_end_date)
    def get_days_remaining(self, obj): return obj.days_remaining
    def get_can_change_plan(self, obj): return obj.can_change_plan
    
    def get_plan_info(self, obj):
        if obj.plan:
            return SubscriptionPlanSerializer(obj.plan).data
        # Fallback for trial or legacy
        return {
            'name': 'Trial' if obj.is_trial else 'Basic',
            'halls': 1,
            'features': ['1 Hall Published', 'Basic Analytics'],
        }


class SubscriptionPaymentSerializer(ModelSerializer):
    partner_name = SerializerMethodField()
    recorded_by_name = SerializerMethodField()
    plan_name = SerializerMethodField()

    class Meta:
        model = SubscriptionPayment
        fields = '__all__'

    def get_partner_name(self, obj):
        return obj.partner.full_name if obj.partner else 'Unknown'

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.full_name if obj.recorded_by else 'System'
    
    def get_plan_name(self, obj):
        return obj.subscription.plan.name if (obj.subscription and obj.subscription.plan) else 'No Plan'


class RecordPaymentSerializer(ModelSerializer):
    class Meta:
        model = SubscriptionPayment
        fields = [
            'subscription', 'partner', 'amount', 'method', 
            'reference_id', 'payment_date', 'valid_from', 
            'valid_until', 'notes'
        ]

    def validate(self, data):
        if data.get('valid_until') and data.get('valid_from'):
            if data['valid_until'] <= data['valid_from']:
                raise ValidationError("Valid until must be after valid from.")
        return data


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """Admin only: manage subscription plans."""
    queryset = SubscriptionPlan.objects.all().order_by('price')
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()


def _expire_partner_halls(partner):
    """Mark halls as subscription_expired for a partner whose plan has lapsed."""
    from halls.models import PartyHall
    PartyHall.objects.filter(
        partner=partner,
        status__in=['approved', 'pending'],
        is_active=True,
    ).update(status='subscription_expired', is_active=False)


def _reactivate_halls(partner):
    """Re-activate halls when partner subscribes."""
    from halls.models import PartyHall
    PartyHall.objects.filter(
        partner=partner,
        status='subscription_expired',
    ).update(status='approved', is_active=True)


class SubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return current subscription status. Lazily expire if needed."""
        try:
            sub = Subscription.objects.get(partner=request.user)
            # --- Lazy expiry check ---
            now = timezone.now()
            if sub.status in ('active', 'trial') and sub.expires_at <= now:
                sub.status = 'expired'
                sub.save(update_fields=['status', 'updated_at'])
                _expire_partner_halls(request.user)

            return Response(SubscriptionSerializer(sub).data)
        except Subscription.DoesNotExist:
            return Response({
                'status': 'none',
                'is_valid': False,
                'trial_used': False,
                'can_change_plan': True,
                'plan_info': {},
            })

    def post(self, request):
        """Create Razorpay order for a paid subscription plan."""
        import razorpay
        from django.conf import settings

        # Block if current plan is still active
        try:
            sub = Subscription.objects.get(partner=request.user)
            if sub.is_valid and not sub.is_trial:
                return Response(
                    {'error': 'Your current plan is still active. You can upgrade after it expires.'},
                    status=400
                )
        except Subscription.DoesNotExist:
            pass

        plan_id = request.data.get('plan_id', 'starter')
        try:
            plan = SubscriptionPlan.objects.get(slug=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': f'Plan {plan_id} not found in database.'}, status=400)

        amount = plan.price

        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order = client.order.create({
                'amount': int(amount * 100),
                'currency': 'INR',
                'receipt': f'sub_{str(request.user.id)[:8]}',
                'notes': {'partner_id': str(request.user.id), 'plan_id': plan_id},
            })
            return Response({
                'order_id': order['id'],
                'amount': amount * 100,
                'key': settings.RAZORPAY_KEY_ID,
            })
        except Exception:
            # Dummy gateway for testing
            return Response({
                'order_id': f'dummy_{plan_id}_{str(request.user.id)[:8]}',
                'amount': amount * 100,
                'key': 'rzp_test_dummy',
                'dummy': True,
            })

    def put(self, request):
        """Verify subscription payment and activate."""
        import hmac, hashlib
        from django.conf import settings

        order_id = request.data.get('razorpay_order_id', '')
        payment_id = request.data.get('razorpay_payment_id', '')
        signature = request.data.get('razorpay_signature', '')
        plan_id = request.data.get('plan_id', 'starter')
        is_dummy = request.data.get('dummy', False)

        try:
            plan = SubscriptionPlan.objects.get(slug=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Invalid plan'}, status=400)

        if not is_dummy and not order_id.startswith('dummy_'):
            key_secret = settings.RAZORPAY_KEY_SECRET
            msg = f'{order_id}|{payment_id}'
            expected = hmac.new(
                key_secret.encode(),
                msg.encode(),
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected, signature):
                return Response({'error': 'Invalid payment signature'}, status=400)

        duration_days = 30 # Default 30 days
        now = timezone.now()
        expires_at = now + timedelta(days=duration_days)

        sub, created = Subscription.objects.update_or_create(
            partner=request.user,
            defaults={
                'plan': plan,
                'legacy_plan_id': plan_id,
                'status': 'active',
                'started_at': now,
                'expires_at': expires_at,
                'is_trial': False,
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
            }
        )

        _reactivate_halls(request.user)

        AdminLog.objects.create(
            admin=request.user, action='subscription_activated',
            entity_type='subscription', entity_id=sub.id,
            metadata={'plan_id': plan_id, 'payment_id': payment_id, 'expires_at': str(expires_at)},
        )
        return Response({'success': True, 'expires_at': expires_at, 'plan_id': plan_id})


class StartTrialView(APIView):
    """Partner starts their one-time 1-hour free trial."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_partner:
            return Response({'error': 'Only partners can start a trial'}, status=403)

        # Check if trial already used
        try:
            sub = Subscription.objects.get(partner=request.user)
            if sub.trial_used:
                return Response({
                    'error': 'You have already used your free trial. Please subscribe to continue.',
                    'trial_used': True,
                }, status=400)
            if sub.is_valid:
                return Response({'error': 'You already have an active subscription.'}, status=400)
        except Subscription.DoesNotExist:
            pass

        now = timezone.now()
        expires_at = now + timedelta(hours=1)

        sub, _ = Subscription.objects.update_or_create(
            partner=request.user,
            defaults={
                'plan': None,
                'legacy_plan_id': 'trial',
                'status': 'trial',
                'started_at': now,
                'expires_at': expires_at,
                'is_trial': True,
                'trial_used': True,
                'trial_started_at': now,
            }
        )

        # Allow trial partner to publish their hall
        from halls.models import PartyHall
        first_hall = PartyHall.objects.filter(partner=request.user).first()
        if first_hall and first_hall.status in ('pending', 'draft', 'subscription_expired'):
            first_hall.status = 'approved'
            first_hall.is_active = True
            first_hall.save(update_fields=['status', 'is_active'])

        AdminLog.objects.create(
            admin=request.user, action='trial_started',
            entity_type='subscription', entity_id=sub.id,
            metadata={'expires_at': str(expires_at)},
        )
        return Response({
            'success': True,
            'trial_expires_at': expires_at,
            'message': 'Your 1-hour free trial has started! Your hall is now live.',
        })


class PlansView(APIView):
    """Public: list available subscription plans."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans_qs = SubscriptionPlan.objects.all().order_by('price')
        serializer = SubscriptionPlanSerializer(plans_qs, many=True)
        return Response(serializer.data)


class AdminLogView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_admin:
            return AdminLog.objects.none()
        return AdminLog.objects.select_related('admin').all()[:200]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = [{
            'id': str(log.id),
            'action': log.action,
            'entity_type': log.entity_type,
            'entity_id': str(log.entity_id) if log.entity_id else None,
            'admin_name': log.admin.full_name if log.admin else 'System',
            'metadata': log.metadata,
            'created_at': log.created_at,
        } for log in qs]
        return Response(data)


class AdminSubscriptionView(APIView):
    """Admin only: list all partner subscriptions, grant or revoke plans."""
    permission_classes = [permissions.IsAuthenticated]

    def _check_admin(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        return None

    def get(self, request):
        err = self._check_admin(request)
        if err: return err

        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Lazy bulk expiry: mark subs that have lapsed
        now = timezone.now()
        lapsed = Subscription.objects.filter(
            status__in=['active', 'trial'],
            expires_at__lte=now,
        )
        for sub in lapsed:
            sub.status = 'expired'
            sub.save(update_fields=['status', 'updated_at'])
            _expire_partner_halls(sub.partner)

        subs = Subscription.objects.select_related('partner').order_by('-created_at')
        data = [{
            'id': str(s.id),
            'partner_id': str(s.partner.id),
            'partner_name': s.partner.full_name,
            'partner_email': s.partner.email,
            'plan_id': s.plan.slug if s.plan else s.legacy_plan_id,
            'status': s.status,
            'is_trial': s.is_trial,
            'is_valid': s.is_valid,
            'days_remaining': s.days_remaining,
            'started_at': s.started_at,
            'expires_at': s.expires_at,
            'can_change_plan': s.can_change_plan,
        } for s in subs]

        # Partners with no subscription at all
        partners_with_sub = {s.partner_id for s in subs}
        no_sub_partners = User.objects.filter(role='partner').exclude(id__in=partners_with_sub)
        for p in no_sub_partners:
            data.append({
                'id': None,
                'partner_id': str(p.id),
                'partner_name': p.full_name,
                'partner_email': p.email,
                'plan_id': None,
                'status': 'none',
                'is_trial': False,
                'is_valid': False,
                'days_remaining': 0,
                'started_at': None,
                'expires_at': None,
                'can_change_plan': True,
            })

        return Response(data)

    def post(self, request):
        """Grant a subscription plan to a partner (no payment required)."""
        err = self._check_admin(request)
        if err: return err

        from django.contrib.auth import get_user_model
        User = get_user_model()

        partner_id = request.data.get('partner_id')
        plan_id = request.data.get('plan_id', 'starter')
        expires_at_str = request.data.get('expires_at')

        try:
            plan = SubscriptionPlan.objects.get(slug=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': f'Plan {plan_id} not found.'}, status=400)

        try:
            partner = User.objects.get(id=partner_id, role='partner')
        except User.DoesNotExist:
            return Response({'error': 'Partner not found'}, status=404)

        now = timezone.now()
        if expires_at_str:
            from django.utils.dateparse import parse_datetime
            expires_at = parse_datetime(expires_at_str)
            if not expires_at:
                return Response({'error': 'Invalid date format for expires_at'}, status=400)
            if timezone.is_naive(expires_at):
                expires_at = timezone.make_aware(expires_at)
            
            if expires_at <= now:
                return Response({'error': 'Expiry date must be in the future.'}, status=400)
        else:
            duration = plan.default_duration_days or 30
            expires_at = now + timedelta(days=duration)
            if timezone.is_naive(expires_at):
                expires_at = timezone.make_aware(expires_at)

        sub, created = Subscription.objects.update_or_create(
            partner=partner,
            defaults={
                'plan': plan,
                'legacy_plan_id': plan_id,
                'status': 'active',
                'started_at': now,
                'expires_at': expires_at,
                'is_trial': False,
                'razorpay_order_id': f'admin_grant_{str(request.user.id)[:8]}',
                'razorpay_payment_id': 'admin_granted',
            }
        )
        _reactivate_halls(partner)

        AdminLog.objects.create(
            admin=request.user, action='subscription_granted',
            entity_type='subscription', entity_id=sub.id,
            metadata={
                'partner': partner.email, 'plan': plan_id,
                'expires_at': str(expires_at),
            }
        )
        return Response({
            'success': True,
            'partner': partner.full_name,
            'plan_id': plan_id,
            'expires_at': expires_at,
        }, status=201 if created else 200)

    def delete(self, request):
        """Revoke (cancel) a partner's subscription and hide their halls."""
        err = self._check_admin(request)
        if err: return err

        partner_id = request.data.get('partner_id')
        try:
            sub = Subscription.objects.select_related('partner').get(partner_id=partner_id)
        except Subscription.DoesNotExist:
            return Response({'error': 'No subscription found for this partner'}, status=404)

        sub.status = 'cancelled'
        sub.save(update_fields=['status', 'updated_at'])
        _expire_partner_halls(sub.partner)

        AdminLog.objects.create(
            admin=request.user, action='subscription_revoked',
            entity_type='subscription', entity_id=sub.id,
            metadata={'partner': sub.partner.email, 'plan': str(sub.plan_id) if sub.plan_id else None},
        )
        return Response({'success': True, 'message': f'Subscription revoked for {sub.partner.email}'})

    def patch(self, request):
        """Admin only: edit a partner's trial or subscription settings."""
        err = self._check_admin(request)
        if err: return err

        from django.contrib.auth import get_user_model
        from django.utils.dateparse import parse_datetime
        User = get_user_model()

        partner_id = request.data.get('partner_id')
        try:
            partner = User.objects.get(id=partner_id)
        except User.DoesNotExist:
            return Response({'error': 'Partner not found'}, status=404)

        now = timezone.now()
        sub, _ = Subscription.objects.get_or_create(
            partner=partner,
            defaults={
                'status': 'trial',
                'is_trial': True,
                'expires_at': now + timedelta(hours=1),
                'trial_started_at': now,
                'trial_used': True
            }
        )

        changes = {}

        # Extend trial by N hours from now
        extend_hours = request.data.get('extend_hours')
        if extend_hours is not None:
            hours = float(extend_hours)
            base = max(sub.expires_at, now) if sub.is_valid else now
            sub.expires_at = base + timedelta(hours=hours)
            sub.status = 'trial'
            sub.is_trial = True
            changes['extend_hours'] = hours

        # Set exact expiry datetime
        expires_at_str = request.data.get('expires_at')
        if expires_at_str:
            expires_at = parse_datetime(expires_at_str)
            if not expires_at:
                return Response({'error': 'Invalid expires_at format'}, status=400)
            if timezone.is_naive(expires_at):
                expires_at = timezone.make_aware(expires_at)
            sub.expires_at = expires_at
            sub.status = 'trial' if sub.is_trial else sub.status
            changes['expires_at'] = str(expires_at)

        # Reset trial_used so partner can start a fresh trial
        if request.data.get('reset_trial'):
            sub.trial_used = False
            sub.is_trial = True
            sub.status = 'trial'
            sub.trial_started_at = now
            if not expires_at_str and not extend_hours:
                sub.expires_at = now + timedelta(hours=1)
            changes['reset_trial'] = True

        # Override trial duration in hours (fresh start)
        trial_hours = request.data.get('trial_hours')
        if trial_hours is not None:
            hours = float(trial_hours)
            sub.expires_at = now + timedelta(hours=hours)
            sub.status = 'trial'
            sub.is_trial = True
            sub.trial_used = True
            sub.trial_started_at = now
            changes['trial_hours'] = hours

        sub.save()


        # Re-activate halls if status is now valid
        if sub.is_valid:
            _reactivate_halls(partner)

        AdminLog.objects.create(
            admin=request.user, action='subscription_edited',
            entity_type='subscription', entity_id=sub.id,
            metadata={'partner': partner.email, 'changes': changes},
        )
        return Response({
            'success': True,
            'partner': partner.full_name,
            'expires_at': sub.expires_at,
            'status': sub.status,
            'is_trial': sub.is_trial,
        })




class AnalyticsSummaryView(APIView):
    """Gated analytics endpoint."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_partner:
            return Response({'error': 'Partner only'}, status=403)
        
        try:
            sub = Subscription.objects.select_related('plan').get(partner=request.user)
            if not sub.is_valid:
                return Response({'error': 'Subscription expired', 'code': 'subscription_expired'}, status=402)
            
            # Feature check
            has_analytics = sub.plan.has_advanced_analytics if sub.plan else False
            if not has_analytics:
                return Response({
                    'error': 'feature_locked',
                    'message': 'Advanced Analytics is included in Pro and Elite plans. Upgrade now to unlock!',
                }, status=403)
            
            # Mock data for now
            return Response({
                'views': 1250,
                'conversion_rate': '4.2%',
                'revenue_trend': [100, 200, 150, 300, 400, 350],
                'popular_slots': ['Saturday Evening', 'Sunday Afternoon'],
            })

        except Subscription.DoesNotExist:
            return Response({'error': 'Subscription required', 'code': 'subscription_required'}, status=402)


class HallStatusView(APIView):
    """Partner: returns hall usage (how many created vs. plan limit)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_partner and not request.user.is_admin:
            return Response({'error': 'Partners only'}, status=403)

        from halls.models import PartyHall

        hall_count = PartyHall.objects.filter(partner=request.user).count()
        published_count = PartyHall.objects.filter(
            partner=request.user, status='approved', is_active=True
        ).count()

        hall_limit = 1
        published_limit = 1
        plan_name = 'Trial'
        plan_slug = None
        is_valid = False

        try:
            sub = Subscription.objects.select_related('plan').get(partner=request.user)
            # Lazy expiry
            now = timezone.now()
            if sub.status in ('active', 'trial') and sub.expires_at <= now:
                sub.status = 'expired'
                sub.save(update_fields=['status', 'updated_at'])
            is_valid = sub.is_valid
            if sub.is_valid and sub.plan and not sub.is_trial:
                hall_limit = sub.plan.hall_limit
                published_limit = sub.plan.hall_limit
                plan_name = sub.plan.name
                plan_slug = sub.plan.slug
            elif sub.is_trial:
                hall_limit = 1
                published_limit = 1
                plan_name = 'Trial'
        except Subscription.DoesNotExist:
            pass

        return Response({
            'hall_count': hall_count,
            'hall_limit': hall_limit,
            'halls_remaining': max(0, hall_limit - hall_count),
            'published_count': published_count,
            'published_limit': published_limit,
            'plan_name': plan_name,
            'plan_slug': plan_slug,
            'is_valid': is_valid,
        })


class AdminSubscriptionPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _check_admin(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        return None

    def get(self, request):
        err = self._check_admin(request)
        if err: return err
        
        payments = SubscriptionPayment.objects.select_related('partner', 'recorded_by', 'subscription__plan').all()
        serializer = SubscriptionPaymentSerializer(payments, many=True)
        return Response(serializer.data)

    def post(self, request):
        err = self._check_admin(request)
        if err: return err
        
        serializer = RecordPaymentSerializer(data=request.data)
        if serializer.is_valid():
            payment = serializer.save(recorded_by=request.user)
            
            # Auto-update subscription if valid_until is provided
            valid_until = serializer.validated_data.get('valid_until')
            if valid_until:
                sub = payment.subscription
                sub.expires_at = valid_until
                sub.status = 'active'
                sub.save(update_fields=['expires_at', 'status', 'updated_at'])
                _reactivate_halls(sub.partner)
                
            return Response(SubscriptionPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
