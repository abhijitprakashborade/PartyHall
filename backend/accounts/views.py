from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer

User = get_user_model()

def set_auth_cookies(response, data):
    """Helper to set ph_access and ph_refresh cookies based on settings."""
    cookie_settings = settings.SIMPLE_JWT
    response.set_cookie(
        cookie_settings['AUTH_COOKIE'],
        data['access'],
        max_age=cookie_settings['ACCESS_TOKEN_LIFETIME'].total_seconds(),
        path=cookie_settings['AUTH_COOKIE_PATH'],
        httponly=cookie_settings['AUTH_COOKIE_HTTP_ONLY'],
        secure=cookie_settings['AUTH_COOKIE_SECURE'],
        samesite=cookie_settings['AUTH_COOKIE_SAMESITE'],
    )
    if 'refresh' in data:
        response.set_cookie(
            cookie_settings['AUTH_COOKIE_REFRESH'],
            data['refresh'],
            max_age=cookie_settings['REFRESH_TOKEN_LIFETIME'].total_seconds(),
            path=cookie_settings['AUTH_COOKIE_PATH'],
            httponly=cookie_settings['AUTH_COOKIE_HTTP_ONLY'],
            secure=cookie_settings['AUTH_COOKIE_SECURE'],
            samesite=cookie_settings['AUTH_COOKIE_SAMESITE'],
        )

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        data = {
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
        response = Response(data, status=status.HTTP_201_CREATED)
        set_auth_cookies(response, data)
        return response

class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            set_auth_cookies(response, response.data)
        return response

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh') or request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])
            if refresh_token:
                from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken
                from rest_framework_simplejwt.exceptions import TokenError
                try:
                    token = JWTRefreshToken(refresh_token)
                    token.blacklist()
                except TokenError:
                    pass
        except Exception:
            pass
        
        response = Response({'message': 'Logged out successfully'})
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'], path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'])
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'], path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'])
        return response

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not old_password or not new_password:
            return Response({'error': 'Both old and new passwords are required.'}, status=400)
        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters.'}, status=400)
        if not request.user.check_password(old_password):
            return Response({'error': 'Current password is incorrect.'}, status=400)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully.'})

class UserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)
        
        users = User.objects.all().order_by('-created_at')

        # Role-based stats (exclude superadmin from regular counts)
        from django.db.models import Q
        super_admin_q = Q(role='superadmin') | Q(is_superuser=True)
        stats = {
            'total':        users.exclude(super_admin_q).count(),
            'partners':     users.filter(role='partner').count(),
            'customers':    users.filter(role='customer').count(),
            'admins':       users.filter(role='admin').exclude(is_superuser=True).count(),
            'active':       users.filter(is_active=True).exclude(super_admin_q).count(),
            'super_admins': users.filter(super_admin_q).count(),
        }

        # Filtering
        role = request.query_params.get('role')
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        sort = request.query_params.get('sort', 'newest')

        if role:
            users = users.filter(role=role)
        if status_filter == 'active':
            users = users.filter(is_active=True)
        elif status_filter == 'inactive' or status_filter == 'suspended':
            users = users.filter(is_active=False)
        
        if search:
            from django.db.models import Q
            users = users.filter(
                Q(email__icontains=search) | Q(full_name__icontains=search)
            )

        if sort == 'newest':
            users = users.order_by('-created_at')
        elif sort == 'oldest':
            users = users.order_by('created_at')
        elif sort == 'name':
            users = users.order_by('full_name', 'email')

        serializer = UserSerializer(users, many=True)
        return Response({
            'stats': stats,
            'users': serializer.data
        })

class UserUpdateView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    lookup_field = 'id'

    def patch(self, request, *args, **kwargs):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)
        
        user_obj = self.get_object()
        
        # Protect superadmin
        if user_obj.role == 'superadmin':
            return Response({'error': 'Super admin accounts cannot be modified.'}, status=403)

        old_active = user_obj.is_active
        response = self.partial_update(request, *args, **kwargs)

        new_active = request.data.get('is_active')
        if new_active is not None and bool(new_active) != old_active:
            from subscriptions.models import AdminLog
            action = 'user_activated' if new_active else 'user_deactivated'
            AdminLog.objects.create(
                admin=request.user, action=action,
                entity_type='user', entity_id=user_obj.id,
                metadata={'email': user_obj.email, 'role': user_obj.role}
            )
        return response

class AdminCreateUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)

        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        full_name = request.data.get('full_name', '').strip()
        phone = request.data.get('phone', '').strip() or None
        role = request.data.get('role', 'customer')

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email already exists.'}, status=400)
        if role not in ('admin', 'partner', 'customer'):
            return Response({'error': 'Invalid role.'}, status=400)
        if len(password) < 6:
            return Response({'error': 'Password must be at least 6 characters.'}, status=400)

        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            phone=phone,
            role=role,
        )

        from subscriptions.models import AdminLog
        AdminLog.objects.create(
            admin=request.user, action='user_created',
            entity_type='user', entity_id=user.id,
            metadata={'email': email, 'role': role}
        )

        return Response(UserSerializer(user).data, status=201)

class AdminDeleteUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, id):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)

        try:
            user_obj = User.objects.get(id=id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        if user_obj.role == 'superadmin':
            return Response({'error': 'Super admin accounts cannot be deleted.'}, status=403)

        if str(user_obj.id) == str(request.user.id):
            return Response({'error': 'You cannot delete your own account.'}, status=400)

        from django.db import transaction

        try:
            with transaction.atomic():
                email = user_obj.email
                role = user_obj.role
                uid = user_obj.id

                from payments.models import Payment
                from bookings.models import Booking

                user_booking_ids = Booking.objects.filter(
                    customer=user_obj
                ).values_list('id', flat=True)
                Payment.objects.filter(booking_id__in=user_booking_ids).delete()

                owner_booking_ids = Booking.objects.filter(
                    owner=user_obj
                ).values_list('id', flat=True)
                Payment.objects.filter(booking_id__in=owner_booking_ids).delete()

                Booking.objects.filter(customer=user_obj).delete()
                Booking.objects.filter(owner=user_obj).delete()

                user_obj.delete()

                from subscriptions.models import AdminLog
                AdminLog.objects.create(
                    admin=request.user, action='user_deleted',
                    entity_type='user', entity_id=uid,
                    metadata={'email': email, 'role': role}
                )

                return Response({'message': f'User {email} deleted successfully.'}, status=200)

        except Exception as e:
            import traceback
            return Response({'error': f'Delete failed: {str(e)}', 'detail': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PartnerCustomerSearchView(APIView):
    """Partner only: search customers by name, phone or email."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_partner and not request.user.is_admin:
            return Response({'error': 'Partners only'}, status=403)

        query = request.query_params.get('search', '').strip()
        from bookings.models import Booking
        from django.db.models import Count, Q

        qs = User.objects.filter(role='customer')
        if query:
            qs = qs.filter(
                Q(full_name__icontains=query) |
                Q(phone__icontains=query) |
                Q(email__icontains=query)
            )
        qs = qs.annotate(booking_count=Count('bookings')).order_by('-booking_count')[:20]

        data = [{
            'id': str(u.id),
            'full_name': u.full_name,
            'phone': u.phone or '',
            'email': u.email,
            'booking_count': u.booking_count,
            'created_at': u.created_at,
        } for u in qs]
        return Response(data)


class PartnerCreateCustomerView(APIView):
    """Partner only: create a walk-in / phone customer on the spot."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_partner and not request.user.is_admin:
            return Response({'error': 'Partners only'}, status=403)

        full_name = request.data.get('full_name', '').strip()
        phone = request.data.get('phone', '').strip()
        email = request.data.get('email', '').strip()
        source = request.data.get('source', 'walk_in')

        if not full_name:
            return Response({'error': 'full_name is required'}, status=400)
        if not phone:
            return Response({'error': 'phone is required'}, status=400)

        # Build a unique email if not provided
        if not email:
            base = f"{phone}@walkin.partyhub.local"
            email = base
            suffix = 0
            while User.objects.filter(email=email).exists():
                suffix += 1
                email = f"{phone}_{suffix}@walkin.partyhub.local"

        if User.objects.filter(email=email).exists():
            # Return existing customer instead of error
            existing = User.objects.get(email=email)
            from bookings.models import Booking
            return Response({
                'id': str(existing.id),
                'full_name': existing.full_name,
                'phone': existing.phone or '',
                'email': existing.email,
                'booking_count': Booking.objects.filter(customer=existing).count(),
                'already_exists': True,
            }, status=200)

        import secrets
        user = User.objects.create_user(
            email=email,
            password=secrets.token_hex(16),
            full_name=full_name,
        )
        user.phone = phone
        user.role = 'customer'
        user.save(update_fields=['phone', 'role'])

        return Response({
            'id': str(user.id),
            'full_name': user.full_name,
            'phone': user.phone,
            'email': user.email,
            'booking_count': 0,
            'source': source,
        }, status=201)

