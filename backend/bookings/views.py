from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import re

from .models import Slot, Booking, BookingAddon
from .serializers import SlotSerializer, BookingSerializer, CreateBookingSerializer
from halls.models import PartyHall, Package, AddonService
from subscriptions.models import Subscription
from services.pricing import PriceCalculator


class SlotViewSet(viewsets.ModelViewSet):
    serializer_class = SlotSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Slot.objects.select_related('hall')
        hall_id = self.request.query_params.get('hall_id')
        date = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        # Validate date format strictly — reject partial dates like 0002-03-30
        date_re = re.compile(r'^\d{4}-\d{2}-\d{2}$')
        if hall_id:
            qs = qs.filter(hall_id=hall_id)
        if date:
            if not date_re.match(date):
                return qs.none()  # silently return empty for partial/invalid dates
            qs = qs.filter(date=date)
        if date_from and date_re.match(date_from):
            qs = qs.filter(date__gte=date_from)
        if date_to and date_re.match(date_to):
            qs = qs.filter(date__lte=date_to)
        return qs


    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def lock(self, request, pk=None):
        """
        Atomic Slot Locking: Locks a slot for exactly 10 minutes when a user enters checkout.
        Uses select_for_update() to prevent race conditions at the database level.
        IDEMPOTENT: If the same user already holds the lock, it is simply extended.
        """
        try:
            with transaction.atomic():
                slot = Slot.objects.select_for_update().get(pk=pk)
                now = timezone.now()

                # ---- BULLETPROOF: Check if ANY active booking already exists for this slot ----
                # This catches edge cases where slot.status was not updated (e.g. system crash)
                has_active_booking = Booking.objects.filter(
                    slot=slot,
                    status__in=['confirmed', 'pending']
                ).exists()
                if has_active_booking:
                    # Fix the slot status if it's out of sync
                    slot.status = 'booked'
                    slot.locked_by = None
                    slot.locked_until = None
                    slot.save(update_fields=['status', 'locked_by', 'locked_until'])
                    return Response({
                        'error': 'This slot is already booked. Please choose a different slot.',
                        'status': 'booked'
                    }, status=status.HTTP_409_CONFLICT)

                # ---- Case 1: Slot is already BOOKED (by anyone) — hard block ----
                if slot.status == 'booked':
                    return Response({
                        'error': 'This slot has already been fully booked.',
                        'status': slot.status
                    }, status=status.HTTP_409_CONFLICT)

                # ---- Case 2: Slot is locked by a DIFFERENT user (lock still valid) ----
                if slot.status == 'locked' and slot.locked_by != request.user:
                    if slot.locked_until and slot.locked_until > now:
                        return Response({
                            'error': 'Slot is currently being checked out by another user. Please try again shortly.',
                            'status': slot.status
                        }, status=status.HTTP_409_CONFLICT)
                    # Lock has expired — fall through and re-lock for this user

                # ---- Case 3: Slot is 'blocked' by admin ----
                if slot.status == 'blocked':
                    return Response({
                        'error': 'This slot has been blocked by the venue.',
                        'status': slot.status
                    }, status=status.HTTP_409_CONFLICT)

                # ---- Case 4: Available OR locked by SAME user — (re-)lock it ----
                slot.status = 'locked'
                slot.locked_by = request.user
                slot.locked_until = now + timedelta(minutes=10)
                slot.save()

            return Response({
                'message': 'Slot locked for 10 minutes. Proceed to payment.',
                'locked_until': slot.locked_until,
            })
        except Slot.DoesNotExist:
            return Response({'error': 'Slot not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def release(self, request, pk=None):
        """Release a slot lock."""
        slot = self.get_object()
        if slot.locked_by != request.user and not request.user.is_admin:
            return Response({'error': 'Not your lock'}, status=403)
        slot.status = 'available'
        slot.locked_by = None
        slot.locked_until = None
        slot.save()
        return Response({'message': 'Slot released'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def block(self, request, pk=None):
        """Admin-only: manually block a slot (e.g. for maintenance/private events)."""
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        with transaction.atomic():
            slot = Slot.objects.select_for_update().get(pk=pk)
            if slot.status == 'booked':
                return Response({'error': 'Cannot block an already booked slot'}, status=status.HTTP_409_CONFLICT)
            slot.status = 'blocked'
            slot.locked_by = None
            slot.locked_until = None
            slot.save()
        return Response({'message': 'Slot blocked by admin', 'slot_id': str(slot.id)})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unblock(self, request, pk=None):
        """Admin-only: reopen a blocked slot."""
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        slot = self.get_object()
        if slot.status != 'blocked':
            return Response({'error': 'Slot is not blocked'}, status=400)
        slot.status = 'available'
        slot.save()
        return Response({'message': 'Slot unblocked', 'slot_id': str(slot.id)})

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='generate_subslots')
    def generate_subslots(self, request):
        """
        Partner action: given a hall_id, date, start_time, end_time —
        auto-create 1-hour sub-slots covering the full window.
        E.g. 09:00–12:00 → creates slots 09:00–10:00, 10:00–11:00, 11:00–12:00.
        """
        hall_id = request.data.get('hall_id')
        date = request.data.get('date')
        start_time_str = request.data.get('start_time', '').strip()
        end_time_str = request.data.get('end_time', '').strip()
        price_override = request.data.get('price_override')

        if not all([hall_id, date, start_time_str, end_time_str]):
            return Response({'error': 'hall_id, date, start_time, end_time are required'}, status=400)

        try:
            hall = PartyHall.objects.get(id=hall_id, partner=request.user)
        except PartyHall.DoesNotExist:
            return Response({'error': 'Hall not found or unauthorized'}, status=404)

        from datetime import datetime, time as dt_time, timedelta as td

        def parse_time(s):
            for fmt in ('%H:%M:%S', '%H:%M'):
                try:
                    return datetime.strptime(s, fmt).time()
                except ValueError:
                    pass
            raise ValueError(f'Cannot parse time: {s}')

        try:
            start = parse_time(start_time_str)
            end = parse_time(end_time_str)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

        if start >= end:
            return Response({'error': 'start_time must be before end_time'}, status=400)

        # Build hourly sub-slots
        created_slots = []
        skipped = []
        current = datetime.combine(datetime.today(), start)
        end_dt = datetime.combine(datetime.today(), end)

        while current + td(hours=1) <= end_dt:
            slot_start = current.time()
            slot_end = (current + td(hours=1)).time()

            slot, created = Slot.objects.get_or_create(
                hall=hall,
                date=date,
                start_time=slot_start,
                defaults={
                    'end_time': slot_end,
                    'status': 'available',
                }
            )
            if created:
                # Note: price_override is not stored on Slot model; kept for future extension
                created_slots.append(slot)
            else:
                skipped.append(f'{slot_start.strftime("%H:%M")}–{slot_end.strftime("%H:%M")}')

            current += td(hours=1)

        from .serializers import SlotSerializer
        return Response({
            'created': SlotSerializer(created_slots, many=True).data,
            'skipped': skipped,
            'message': f'Created {len(created_slots)} slot(s). Skipped {len(skipped)} existing.'
        }, status=201)


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """Allow unauthenticated users to call calculate_price (used for live price preview)."""
        if self.action == 'calculate_price':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        base_qs = Booking.objects.select_related(
            'hall', 'customer', 'package', 'slot', 'owner'
        ).prefetch_related(
            'booking_addons__addon',
        )
        if user.is_admin:
            return base_qs.all()
        if user.is_partner:
            from django.db.models import Q
            return base_qs.filter(
                Q(owner=user) | Q(owner__isnull=True, hall__partner=user)
            ).distinct()
        return base_qs.filter(customer=user)

    @action(detail=False, methods=['get'])
    def checkin_lookup(self, request):
        """Partner/Admin: look up a booking by QR token for check-in."""
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'QR token required'}, status=400)
        try:
            booking = Booking.objects.select_related('hall', 'customer', 'package').get(qr_code_token=token)
        except Booking.DoesNotExist:
            return Response({'error': 'Invalid or expired QR code'}, status=404)

        # ✅ SECURITY: Only the hall owner or admin can access QR data
        # Partner B scanning Partner A's guest gets a 403, NOT the booking data
        if request.user.is_admin:
            pass  # Admin has full access
        elif booking.owner == request.user:
            pass  # Correct owner
        else:
            # Deliberately vague message — don't reveal the booking exists to other partners
            return Response({'error': 'Unauthorized. This booking does not belong to your venue.'}, status=403)

        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def checkin(self, request, pk=None):
        """Partner/Admin: mark a booking as checked-in."""
        booking = self.get_object()

        can_checkin = (
            request.user.is_admin or
            booking.hall.partner == request.user
        )
        if not can_checkin:
            return Response({'error': 'Unauthorized'}, status=403)

        if booking.status != 'confirmed':
            return Response({'error': f'Cannot check in a booking with status "{booking.status}"'}, status=400)

        if booking.checked_in_at:
            return Response({'error': 'Already checked in', 'checked_in_at': booking.checked_in_at}, status=409)

        booking.checked_in_at = timezone.now()
        booking.save(update_fields=['checked_in_at'])

        return Response({
            'message': 'Check-in successful',
            'booking_ref': booking.booking_ref,
            'customer_name': booking.customer.full_name,
            'checked_in_at': booking.checked_in_at,
        })

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Partner/Admin: mark a booking as checked-out."""
        booking = self.get_object()

        can_manage = (
            request.user.is_admin or
            booking.hall.partner == request.user
        )
        if not can_manage:
            return Response({'error': 'Unauthorized'}, status=403)

        if not booking.checked_in_at:
            return Response({'error': 'Cannot check out before check-in'}, status=400)

        if booking.checked_out_at:
            return Response({'error': 'Already checked out', 'checked_out_at': booking.checked_out_at}, status=409)

        booking.checked_out_at = timezone.now()
        booking.status = 'completed'
        booking.save(update_fields=['checked_out_at', 'status'])

        return Response({
            'message': 'Check-out successful',
            'booking_ref': booking.booking_ref,
            'checked_out_at': booking.checked_out_at,
            'status': booking.status
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def calculate_price(self, request):
        """
        Public endpoint for real-time pricing updates on the frontend.
        Expects: hall_id, start_time, end_time, guest_count, addon_ids, addon_quantities.
        Optionally: duration_hours_override for non-contiguous multi-slot bookings.
        Returns: detailed breakdown of costs.
        """
        hall_id = request.data.get('hall_id')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        guest_count = int(request.data.get('guest_count', 10))
        addon_ids = request.data.get('addon_ids', [])
        addon_quantities = request.data.get('addon_quantities', {})

        # Multi-slot pricing params
        slot_count = int(request.data.get('slot_count', 1) or 1)
        gap_hours = float(request.data.get('gap_hours', 0) or 0)
        same_event = bool(request.data.get('same_event', True))
        num_event_segments = int(request.data.get('num_event_segments', 1) or 1)

        duration_hours_override = request.data.get('duration_hours_override')
        if duration_hours_override is not None:
            try:
                duration_hours_override = float(duration_hours_override)
            except (ValueError, TypeError):
                duration_hours_override = None

        try:
            hall = PartyHall.objects.select_related('partner__subscription').get(id=hall_id)
            
            # --- SUBSCRIPTION CHECK ---
            sub = getattr(hall.partner, 'subscription', None)
            if not sub or not sub.is_valid:
                return Response({
                    'error': 'This venue is currently not accepting bookings due to an expired subscription.',
                    'code': 'subscription_expired'
                }, status=403)

            selected_addons = AddonService.objects.filter(id__in=addon_ids)
            
            package_id = request.data.get('package_id')
            package = None
            if package_id:
                package = Package.objects.filter(id=package_id, hall=hall).first()

            result = PriceCalculator.calculate_total(
                hall=hall,
                start_time=start_time,
                end_time=end_time,
                guest_count=guest_count,
                selected_addons=selected_addons,
                addon_quantities=addon_quantities,
                package=package,
                duration_hours_override=duration_hours_override,
                slot_count=slot_count,
                gap_hours=gap_hours,
                same_event=same_event,
                num_event_segments=num_event_segments,
            )
            return Response(result)
        except PartyHall.DoesNotExist:
            return Response({'error': 'Hall not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def create_booking(self, request):
        """
        High-Security Pre-payment Check & Booking Creation.
        Supports both single-slot and non-contiguous multi-slot bookings.
        Validates availability on the server-side IMMEDIATELY before finalizing.
        """
        s = CreateBookingSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        with transaction.atomic():
            try:
                slot_ids = data['slot_ids']
                # Lock all selected slots atomically
                slots = list(Slot.objects.select_for_update().filter(id__in=slot_ids).order_by('date', 'start_time'))
                if len(slots) != len(slot_ids):
                    return Response({'error': 'One or more slots not found'}, status=404)

                hall = PartyHall.objects.select_related('partner__subscription').get(id=data['hall_id'])
                package = Package.objects.get(id=data['package_id'])
            except (PartyHall.DoesNotExist, Package.DoesNotExist) as e:
                return Response({'error': 'Hall or package not found'}, status=404)

            # --- SUBSCRIPTION CHECK ---
            sub = getattr(hall.partner, 'subscription', None)
            if not sub or not sub.is_valid:
                return Response({
                    'error': 'Checkout failed: The venue owner has an expired subscription.',
                    'code': 'subscription_expired'
                }, status=403)

            # CRITICAL: Validate ALL slots are locked and held by this user
            for slot in slots:
                if slot.status == 'booked':
                    return Response({'error': f'Slot {slot.start_time} was just booked by someone else.'}, status=409)
                if slot.status != 'locked' or slot.locked_by != request.user:
                    return Response({'error': f'Lock invalid for slot {slot.start_time}. Please restart your booking.'}, status=403)
                if slot.locked_until < timezone.now():
                    return Response({'error': 'Your 10-minute booking window has expired. Please try again.'}, status=409)

            # Calculate total hours across all selected slots (correct for non-contiguous)
            from datetime import datetime as dt
            slot_count = len(slots)
            duration_hours_override = data.get('duration_hours_override')
            if not duration_hours_override:
                # Sum each individual slot's duration
                total_minutes = 0
                for s in slots:
                    start_dt = dt.combine(dt.today(), s.start_time)
                    end_dt = dt.combine(dt.today(), s.end_time)
                    total_minutes += (end_dt - start_dt).seconds // 60
                duration_hours_override = total_minutes / 60.0 if total_minutes > 0 else float(slot_count)

            # Calculate gap hours between non-contiguous slots
            gap_hours = 0.0
            if slot_count > 1:
                for i in range(1, slot_count):
                    prev = slots[i-1]
                    curr = slots[i]
                    # Currently only calculating same-day gaps
                    if prev.date == curr.date:
                        p_end = prev.end_time.hour * 60 + prev.end_time.minute
                        c_start = curr.start_time.hour * 60 + curr.start_time.minute
                        gap = c_start - p_end
                        if gap > 0:
                            gap_hours += gap / 60.0

            # Count separate event segments (groups of consecutive slots)
            num_event_segments = 1
            for i in range(1, slot_count):
                prev = slots[i-1]
                curr = slots[i]
                if prev.date == curr.date:
                    p_end = prev.end_time.hour * 60 + prev.end_time.minute
                    c_start = curr.start_time.hour * 60 + curr.start_time.minute
                    if c_start > p_end:
                        num_event_segments += 1
                else:
                    num_event_segments += 1

            first_slot = slots[0]
            last_slot = slots[-1]

            # CRITICAL: Independent Backend Price Re-calculation (Security Handshake)
            selected_addons = AddonService.objects.filter(id__in=data.get('addon_ids', []))
            addon_quantities = data.get('addon_quantities', {})

            pricing = PriceCalculator.calculate_total(
                hall=hall,
                start_time=data.get('slot_start_time') or first_slot.start_time,
                end_time=data.get('slot_end_time') or last_slot.end_time,
                guest_count=data['guest_count'],
                selected_addons=selected_addons,
                addon_quantities=addon_quantities,
                package=package,
                duration_hours_override=duration_hours_override,
                slot_count=slot_count,
                gap_hours=gap_hours,
                same_event=data.get('same_event', True),
                num_event_segments=num_event_segments,
            )

            booking = Booking.objects.create(
                hall=hall,
                customer=request.user,
                slot=first_slot,   # legacy FK: first slot
                package=package,
                base_amount=pricing['base_price'],
                addons_amount=pricing['addons_total'],
                total_amount=pricing['grand_total'],
                guest_count=data['guest_count'],
                special_notes=data.get('special_notes', ''),
                slot_date=first_slot.date,
                slot_start_time=data.get('slot_start_time') or first_slot.start_time,
                slot_end_time=data.get('slot_end_time') or last_slot.end_time,
                status='confirmed' if hall.instant_confirmation else 'pending'
            )

            # Store all selected slots in M2M (for correct display of non-contiguous slots)
            booking.selected_slots.set(slots)

            # Mark ALL selected slots as booked
            slot_id_list = [str(s.id) for s in slots]
            Slot.objects.filter(id__in=slot_id_list).update(
                status='booked', locked_until=None, locked_by=None
            )

            for addon in selected_addons:
                BookingAddon.objects.create(
                    booking=booking, addon=addon,
                    quantity=1, unit_price=addon.price
                )

        return Response(BookingSerializer(booking).data, status=201)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a confirmed booking with refund calculation."""
        booking = self.get_object()

        if booking.status not in ['pending', 'confirmed']:
            return Response({'error': 'Cannot cancel this booking'}, status=400)

        can_cancel = (
            booking.customer == request.user or
            request.user.is_admin or
            booking.hall.partner == request.user
        )
        if not can_cancel:
            return Response({'error': 'Unauthorized'}, status=403)

        # Calculate refund
        now = timezone.now()
        if booking.slot_date and booking.slot_start_time:
            from datetime import datetime
            slot_dt = timezone.make_aware(datetime.combine(booking.slot_date, booking.slot_start_time))
            hours_until = (slot_dt - now).total_seconds() / 3600
            hall = booking.hall
            if hours_until >= 3:
                refund_pct = hall.refund_percentage_3h
            elif hours_until >= 2:
                refund_pct = hall.refund_percentage_2h
            else:
                refund_pct = hall.refund_percentage_1h
        else:
            refund_pct = 0

        refund_amt = (booking.total_amount * refund_pct) / 100

        booking.status = 'cancelled'
        booking.cancellation_reason = request.data.get('reason', '')
        booking.cancelled_at = now
        booking.refund_amount = refund_amt
        booking.refund_status = 'pending' if refund_amt > 0 else ''
        booking.save()

        if booking.slot:
            booking.slot.status = 'available'
            booking.slot.save()

        return Response({
            'message': 'Booking cancelled',
            'refund_amount': str(refund_amt),
            'refund_percentage': refund_pct,
        })


class BookingByTokenView(generics.RetrieveAPIView):
    """
    PUBLIC endpoint: fetch full booking details by QR code token.
    Used when someone scans the QR code — shows the complete booking ticket.
    No authentication required (the token itself is the secret).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            booking = Booking.objects.select_related(
                'hall', 'customer', 'package', 'slot'
            ).prefetch_related(
                'booking_addons__addon'
            ).get(qr_code_token=token)
        except Booking.DoesNotExist:
            return Response({'error': 'Invalid QR code or booking not found'}, status=404)

        addons_data = []
        addons_total = 0
        for ba in booking.booking_addons.all():
            line_total = float(ba.quantity * ba.unit_price)
            addons_total += line_total
            addons_data.append({
                'name': ba.addon.name,
                'category': ba.addon.category,
                'description': ba.addon.description,
                'quantity': ba.quantity,
                'unit_price': str(ba.unit_price),
                'total': str(line_total),
                # e.g. "Premium Thali ×34 @ ₹150 = ₹5,100"
                'display': f"{ba.addon.name} ×{ba.quantity} @ ₹{ba.unit_price}",
            })

        package_data = None
        if booking.package:
            package_data = {
                'name': booking.package.name,
                'price': str(booking.package.price),
                'duration_hours': booking.package.duration_hours,
                'max_people': booking.package.max_people,
                'inclusions': booking.package.inclusions,
            }

        hall = booking.hall
        primary_image = hall.images.filter(is_primary=True).first() or hall.images.first()

        def fmt_time(t):
            if not t: return ''
            from datetime import datetime
            dummy = datetime.combine(datetime.today(), t)
            # %-I is Linux-only; use %I and lstrip('0') for cross-platform
            hour = dummy.strftime('%I').lstrip('0') or '12'
            return f"{hour}:{dummy.strftime('%M %p')}"

        return Response({
            # Booking identifiers
            'booking_ref': booking.booking_ref,
            'qr_code_token': token,
            'status': booking.status,

            # Customer
            'customer_name': booking.customer.full_name or booking.customer.email,

            # Hall details
            'hall_name': hall.name,
            'hall_address': hall.address,
            'hall_city': hall.city,
            'hall_image': request.build_absolute_uri(primary_image.image.url) if primary_image and primary_image.image else (primary_image.url if primary_image else None),

            # Date & time (IST display)
            'slot_date': str(booking.slot_date),
            'start_time': fmt_time(booking.slot_start_time),
            'end_time': fmt_time(booking.slot_end_time),
            'start_time_raw': str(booking.slot_start_time),
            'end_time_raw': str(booking.slot_end_time),

            # Guest info
            'guest_count': booking.guest_count,
            'special_notes': booking.special_notes,

            # Package & addons
            'package': package_data,
            'addons': addons_data,

            # Full price breakdown (for receipt / QR pages)
            'price_breakdown': {
                'package_price': str(booking.package.price) if booking.package else '0',
                'base_amount': str(booking.base_amount),
                'addons_amount': str(booking.addons_amount),
                'total_amount': str(booking.total_amount),
                'guest_count': booking.guest_count,
            },

            # Financials (kept for backward compat)
            'base_amount': str(booking.base_amount),
            'addons_amount': str(booking.addons_amount),
            'total_amount': str(booking.total_amount),

            # Check-in
            'checked_in_at': booking.checked_in_at,
            'checked_out_at': booking.checked_out_at,
            'created_at': booking.created_at,

            # Individual slots (for non-contiguous multi-slot display)
            'selected_slots': [
                {
                    'start_time': fmt_time(s.start_time),
                    'end_time': fmt_time(s.end_time),
                    'start_raw': str(s.start_time),
                    'end_raw': str(s.end_time),
                }
                for s in booking.selected_slots.order_by('start_time')
            ],
        })


from rest_framework.views import APIView as _APIView

class PartnerCreateBookingView(_APIView):
    """Partner only: create a booking for a customer (walk-in / phone / partner-created)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_partner and not request.user.is_admin:
            return Response({'error': 'Partners only'}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        customer_id = request.data.get('customer_id')
        slot_ids = request.data.get('slot_ids', [])
        package_id = request.data.get('package_id')
        guests = int(request.data.get('guests', 10))
        payment_method = request.data.get('payment_method', 'cash')
        special_notes = request.data.get('special_notes', '')
        custom_amount = request.data.get('custom_amount')  # for "Custom" package option
        booking_type = request.data.get('booking_type', 'partner_created')

        if not customer_id:
            return Response({'error': 'customer_id is required'}, status=400)
        if not slot_ids:
            return Response({'error': 'At least one slot_id is required'}, status=400)

        try:
            customer = User.objects.get(id=customer_id)
        except User.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)

        # Get partner hall
        hall = PartyHall.objects.filter(partner=request.user).first()
        if not hall:
            return Response({'error': 'No hall found for this partner'}, status=404)

        # Validate and fetch slots
        try:
            slots = Slot.objects.filter(id__in=slot_ids, hall=hall)
        except Exception:
            return Response({'error': 'Invalid slot IDs'}, status=400)

        if len(slots) != len(slot_ids):
            return Response({'error': 'Some slots not found for your hall'}, status=400)

        for slot in slots:
            if slot.status == 'booked':
                return Response({'error': f'Slot {slot.start_time} is already booked'}, status=409)

        # Resolve package
        package = None
        if package_id:
            try:
                package = Package.objects.get(id=package_id, hall=hall)
            except Package.DoesNotExist:
                return Response({'error': 'Package not found'}, status=404)

        # Calculate amount
        if custom_amount:
            base_amount = float(custom_amount)
        elif package:
            base_amount = float(package.price)
            extra = max(0, guests - (package.max_people or hall.base_capacity))
            base_amount += extra * float(hall.extra_guest_fee)
        else:
            base_amount = float(hall.price_per_slot) * len(slots)

        with transaction.atomic():
            # Use first slot for FK (legacy), but record all in notes if multiple
            first_slot = slots.order_by('start_time').first()

            booking = Booking.objects.create(
                hall=hall,
                customer=customer,
                owner=request.user,
                slot=first_slot,
                package=package,
                base_amount=base_amount,
                addons_amount=0,
                total_amount=base_amount,
                guest_count=guests,
                special_notes=f"[{booking_type.upper()} | {payment_method.upper()}] {special_notes}".strip(),
                status='confirmed',
                slot_date=first_slot.date,
                slot_start_time=first_slot.start_time,
                slot_end_time=slots.order_by('-end_time').first().end_time,
            )

            # Mark all selected slots as booked
            Slot.objects.filter(id__in=slot_ids).update(status='booked')

        return Response({
            'success': True,
            'booking_id': str(booking.id),
            'booking_ref': booking.booking_ref,
            'qr_token': booking.qr_code_token,
            'customer_name': customer.full_name,
            'total_amount': str(booking.total_amount),
            'status': booking.status,
        }, status=201)

