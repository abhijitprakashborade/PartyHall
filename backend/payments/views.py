import json
import hmac
import hashlib
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from bookings.models import Booking
from .models import Payment
from .gateways import PaymentGatewayFactory


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        try:
            booking = Booking.objects.get(id=booking_id, customer=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        amount_paise = int(booking.total_amount * 100)
        gateway = PaymentGatewayFactory.get()
        print(f"DEBUG: Active Payment Gateway selected: {gateway.name}")
        
        try:
            order_data = gateway.create_order(
                amount_paise=amount_paise,
                booking_id=booking.id,
                customer_email=request.user.email
            )
            
            Payment.objects.create(
                booking=booking,
                gateway=gateway.name,
                order_id=order_data['order_id'],
                amount=booking.total_amount,
            )

            return Response(order_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        gateway = PaymentGatewayFactory.get()
        if not gateway.verify_payment(request.data):
            return Response({'error': 'Invalid payment verification'}, status=400)

        order_id = request.data.get('order_id') or request.data.get('razorpay_order_id')
        try:
            payment = Payment.objects.get(order_id=order_id)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment record not found'}, status=404)

        payment.payment_id = request.data.get('payment_id') or request.data.get('razorpay_payment_id')
        payment.signature = request.data.get('signature') or request.data.get('razorpay_signature', '')
        payment.status = 'captured'
        payment.save()

        booking = payment.booking
        booking.status = 'confirmed'
        booking.save()

        if booking.slot:
            booking.slot.status = 'booked'
            booking.slot.save()

        # Send SMS confirmation
        self._send_sms(booking)

        return Response({
            'success': True,
            'booking_ref': booking.booking_ref,
            'qr_token': booking.qr_code_token,
        })

    def _send_sms(self, booking):
        try:
            import requests
            msg = f'PartyHub: Your booking {booking.booking_ref} is confirmed for {booking.slot_date}. QR: {settings.FRONTEND_URL}/booking/success?ref={booking.booking_ref}'
            requests.post('https://www.fast2sms.com/dev/bulkV2', data={
                'route': 'v3', 'sender_id': 'TXTIND',
                'message': msg, 'language': 'english',
                'numbers': booking.customer.phone,
            }, headers={'authorization': settings.FAST2SMS_API_KEY}, timeout=5)
        except Exception:
            pass


@method_decorator(csrf_exempt, name='dispatch')
class WebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig = request.headers.get('X-Razorpay-Signature', '')
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            payload,
            digestmod=hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected, sig):
            return Response({'error': 'Invalid signature'}, status=400)

        data = json.loads(payload)
        event = data.get('event')

        if event == 'payment.captured':
            payment_entity = data['payload']['payment']['entity']
            order_id = payment_entity['order_id']
            try:
                payment = Payment.objects.get(order_id=order_id)
                payment.status = 'captured'
                payment.payment_method = payment_entity.get('method', '')
                payment.save()
                payment.booking.status = 'confirmed'
                payment.booking.save()
            except Payment.DoesNotExist:
                pass

        return Response({'status': 'ok'})


class RefundView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        if not request.user.is_admin:
            return Response({'error': 'Admin only'}, status=403)

        try:
            booking = Booking.objects.get(id=booking_id)
            payment = booking.payments.filter(status='captured').first()
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if not payment:
            return Response({'error': 'No captured payment found'}, status=400)

        refund_amount = request.data.get('amount', booking.refund_amount)
        refund_paise = int(float(refund_amount) * 100)

        gateway = PaymentGatewayFactory.get()
        result = gateway.refund(payment.payment_id, refund_paise)

        if result['success']:
            booking.refund_status = 'completed'
            booking.status = 'refunded'
            booking.save()
            
            payment.refund_id = result['refund_id']
            payment.refunded_amount = float(refund_amount)
            payment.status = 'refunded'
            payment.save()
            return Response({'success': True, 'refund_id': result['refund_id']})
        else:
            return Response({'error': result.get('error', 'Refund failed')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
