from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer

from .models import Review
from subscriptions.models import AdminLog


class ReviewSerializer(ModelSerializer):
    customer_name = None

    class Meta:
        model = Review
        fields = ['id', 'hall', 'booking', 'rating', 'comment', 'is_approved', 'created_at']
        read_only_fields = ['id', 'is_approved', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['customer_name'] = instance.customer.full_name
        data['hall_name'] = instance.hall.name
        return data


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        hall_id = self.request.query_params.get('hall_id')
        qs = Review.objects.select_related('customer', 'hall')

        if user.is_authenticated and user.is_admin:
            pass  # Admin sees all
        elif user.is_authenticated:
            qs = qs.filter(is_approved=True) | qs.filter(customer=user)
        else:
            qs = qs.filter(is_approved=True)

        if hall_id:
            qs = qs.filter(hall_id=hall_id)
        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError, PermissionDenied
        user = self.request.user
        booking = serializer.validated_data.get('booking')

        # Validate booking belongs to this customer
        if booking and booking.customer != user:
            raise PermissionDenied('You can only review your own bookings.')

        # Friendly duplicate check (OneToOneField gives an opaque unique-constraint error)
        if booking and hasattr(booking, 'review'):
            raise ValidationError({'booking': 'You have already submitted a review for this booking.'})

        # Ensure the booking is completed before reviewing
        if booking and booking.status != 'completed':
            raise ValidationError({'booking': 'You can only review a completed booking.'})

        serializer.save(customer=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)
        review = self.get_object()
        review.is_approved = True
        review.moderated_by = request.user
        from django.utils import timezone
        review.moderated_at = timezone.now()
        review.save()

        # Update hall rating
        hall = review.hall
        from django.db.models import Avg
        avg = Review.objects.filter(hall=hall, is_approved=True).aggregate(avg=Avg('rating'))['avg'] or 0
        count = Review.objects.filter(hall=hall, is_approved=True).count()
        hall.rating_avg = round(avg, 2)
        hall.total_reviews = count
        hall.save(update_fields=['rating_avg', 'total_reviews'])

        AdminLog.objects.create(admin=request.user, action='review_approved', entity_type='review', entity_id=review.id)
        return Response({'status': 'approved', 'rating_avg': hall.rating_avg})

    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def remove(self, request, pk=None):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)
        review = self.get_object()
        review_id = review.id
        review.delete()
        AdminLog.objects.create(admin=request.user, action='review_removed', entity_type='review', entity_id=review_id)
        return Response(status=204)
