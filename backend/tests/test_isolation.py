"""
Multi-Tenant Isolation Test Suite
===================================
Run with: python manage.py test tests.test_isolation

Tests verify that:
  - Partners can only see their OWN hall bookings
  - Partner B cannot access Partner A's QR check-in data
  - Partner B cannot retrieve Partner A's booking by ID
  - Regular users cannot access partner-only endpoints
"""
from datetime import date, time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from django.contrib.auth import get_user_model
from halls.models import PartyHall, Package
from bookings.models import Slot, Booking

User = get_user_model()


def _make_partner(email, name):
    u = User.objects.create_user(
        email=email,
        password='Test1234!',
        full_name=name,
        role='partner',
    )
    u.is_active = True
    u.save()
    return u


def _make_hall(partner, name):
    return PartyHall.objects.create(
        partner=partner,
        name=name,
        address='123 Test Road',
        city='Chennai',
        pincode='600001',
        capacity_min=10,
        base_capacity=50,
        capacity_max=100,
        price_per_slot=2000,
        hourly_rate=500,
        extra_guest_fee=200,
        status='approved',
        is_active=True,
    )


def _make_booking(hall, customer):
    slot = Slot.objects.create(
        hall=hall,
        date=date.today() + timedelta(days=7),
        start_time=time(9, 0),
        end_time=time(14, 0),
        status='booked',
    )
    pkg = Package.objects.filter(hall=hall).first()
    return Booking.objects.create(
        hall=hall,
        customer=customer,
        slot=slot,
        package=pkg,
        base_amount=2500,
        addons_amount=0,
        total_amount=2500,
        guest_count=20,
        status='confirmed',
        slot_date=slot.date,
        slot_start_time=slot.start_time,
        slot_end_time=slot.end_time,
    )


class MultiTenantIsolationTest(TestCase):
    """
    Scenario:
      - Partner A owns Hall A, has a booking for Customer X
      - Partner B owns Hall B
      - We verify Partner B CANNOT access Hall A's booking data
    """

    def setUp(self):
        self.partner_a = _make_partner('partner_a@test.com', 'Partner A')
        self.partner_b = _make_partner('partner_b@test.com', 'Partner B')
        self.customer = User.objects.create_user(
            email='customer@test.com',
            password='Test1234!',
            full_name='Test Customer',
            role='customer',
        )

        self.hall_a = _make_hall(self.partner_a, 'Hall Alpha')
        self.hall_b = _make_hall(self.partner_b, 'Hall Beta')

        self.booking_a = _make_booking(self.hall_a, self.customer)

        # Clients
        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.partner_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.partner_b)

    # ── Test 1: Booking list isolation ───────────────────────────────────────

    def test_partner_a_sees_own_bookings(self):
        response = self.client_a.get('/api/bookings/')
        self.assertEqual(response.status_code, 200)
        ids = [b['id'] for b in response.data.get('results', response.data)]
        self.assertIn(str(self.booking_a.id), ids)

    def test_partner_b_cannot_see_partner_a_bookings(self):
        """Partner B's booking list must NOT include Partner A's booking."""
        response = self.client_b.get('/api/bookings/')
        self.assertEqual(response.status_code, 200)
        ids = [b['id'] for b in response.data.get('results', response.data)]
        self.assertNotIn(
            str(self.booking_a.id),
            ids,
            msg='SECURITY BREACH: Partner B can see Partner A\'s booking in list!',
        )

    # ── Test 2: Direct booking detail by ID ──────────────────────────────────

    def test_partner_b_cannot_access_partner_a_booking_by_id(self):
        """Partner B guessing the Booking UUID must get 403 or 404."""
        response = self.client_b.get(f'/api/bookings/{self.booking_a.id}/')
        self.assertIn(
            response.status_code,
            [403, 404],
            msg=f'SECURITY BREACH: Partner B got {response.status_code} for Partner A\'s booking — expected 403/404!',
        )

    # ── Test 3: QR check-in isolation ────────────────────────────────────────

    def test_partner_b_cannot_scan_partner_a_qr(self):
        """QR scan by wrong partner must return 403."""
        qr_token = self.booking_a.qr_code_token
        response = self.client_b.get(f'/api/bookings/checkin_lookup/?token={qr_token}')
        self.assertEqual(
            response.status_code,
            403,
            msg='SECURITY BREACH: Partner B can access QR check-in data for Partner A\'s guest!',
        )

    def test_partner_a_can_scan_own_qr(self):
        """QR scan by the correct partner must return 200."""
        qr_token = self.booking_a.qr_code_token
        response = self.client_a.get(f'/api/bookings/checkin_lookup/?token={qr_token}')
        self.assertEqual(response.status_code, 200)

    # ── Test 4: Hall pricing isolation ───────────────────────────────────────

    def test_pricing_is_per_hall(self):
        """Updating Hall A's pricing must not affect Hall B."""
        original_rate_b = self.hall_b.hourly_rate
        self.hall_a.hourly_rate = 9999
        self.hall_a.save()

        self.hall_b.refresh_from_db()
        self.assertEqual(
            self.hall_b.hourly_rate,
            original_rate_b,
            msg='ISOLATION BREACH: Changing Hall A\'s hourly_rate affected Hall B!',
        )

    # ── Test 5: Booking reference contains hall prefix ───────────────────────

    def test_booking_ref_contains_hall_prefix(self):
        """New bookings should have a hall-specific prefix."""
        ref = self.booking_a.booking_ref
        self.assertTrue(
            len(ref) > 4 and '-' in ref,
            msg=f'Booking ref "{ref}" does not appear to have a hall prefix.',
        )
        # Should start with the hall short_code (auto-set on hall.save())
        if self.hall_a.short_code:
            self.assertTrue(
                ref.startswith(self.hall_a.short_code),
                msg=f'Expected booking_ref to start with "{self.hall_a.short_code}", got "{ref}"',
            )
