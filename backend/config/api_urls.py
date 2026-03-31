from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from accounts.views import RegisterView, LoginView, MeView, LogoutView, UserListView, UserUpdateView, AdminCreateUserView, AdminDeleteUserView, ChangePasswordView, PartnerCustomerSearchView, PartnerCreateCustomerView
from halls.views import HallViewSet, PackageViewSet, AddonServiceViewSet
from bookings.views import SlotViewSet, BookingViewSet, BookingByTokenView, PartnerCreateBookingView
from payments.views import CreateOrderView, VerifyPaymentView, WebhookView, RefundView
from reviews.views import ReviewViewSet
from subscriptions.views import (
    SubscriptionView, AdminLogView, AdminSubscriptionView,
    StartTrialView, PlansView, SubscriptionPlanViewSet,
    AnalyticsSummaryView, HallStatusView, AdminSubscriptionPaymentView,
)

router = DefaultRouter()
router.register(r'halls', HallViewSet, basename='hall')
router.register(r'slots', SlotViewSet, basename='slot')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'packages', PackageViewSet, basename='package')
router.register(r'addon-services', AddonServiceViewSet, basename='addon')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscription-plan')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Admin
    path('admin/users/', UserListView.as_view(), name='admin-users'),
    path('admin/users/create/', AdminCreateUserView.as_view(), name='admin-create-user'),
    path('admin/users/<uuid:id>/delete/', AdminDeleteUserView.as_view(), name='admin-delete-user'),
    path('auth/users/', UserListView.as_view(), name='auth-users'),
    path('auth/users/<uuid:id>/', UserUpdateView.as_view(), name='auth-users-update'),
    path('admin/logs/', AdminLogView.as_view(), name='admin-logs'),
    path('admin/subscriptions/', AdminSubscriptionView.as_view(), name='admin-subscriptions'),
    path('admin/subscription-payments/', AdminSubscriptionPaymentView.as_view(), name='admin-subscription-payments'),

    # Partner customer & booking creation
    path('partner/customers/', PartnerCustomerSearchView.as_view(), name='partner-customers'),
    path('partner/customers/create/', PartnerCreateCustomerView.as_view(), name='partner-create-customer'),
    path('partner/bookings/create/', PartnerCreateBookingView.as_view(), name='partner-create-booking'),

    # Payments
    path('payments/create-order/', CreateOrderView.as_view(), name='create-order'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('payments/webhook/', WebhookView.as_view(), name='razorpay-webhook'),
    path('payments/refund/<uuid:booking_id>/', RefundView.as_view(), name='refund'),

    # Subscription
    path('subscriptions/', SubscriptionView.as_view(), name='subscription'),
    path('subscriptions/start-trial/', StartTrialView.as_view(), name='start-trial'),
    path('subscriptions/plans/', PlansView.as_view(), name='plans'),
    path('subscriptions/analytics-summary/', AnalyticsSummaryView.as_view(), name='analytics-summary'),
    path('subscriptions/hall-status/', HallStatusView.as_view(), name='hall-status'),

    # Public: booking by QR token
    path('bookings/token/<str:token>/', BookingByTokenView.as_view(), name='booking-by-token'),

    # Router
    path('', include(router.urls)),

    # OpenAPI docs
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
