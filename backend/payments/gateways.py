"""
Multi-tier Payment Gateway Factory
===================================
Selects the active gateway based on settings.PAYMENT_GATEWAY:
  'dummy'    → DummyGateway    (instant fake order — dev only)
  'cashfree' → CashfreeGateway (Sandbox API — test/staging)
  'razorpay' → RazorpayGateway (Live API — production)

Usage in views:
    gateway = PaymentGatewayFactory.get()
    order   = gateway.create_order(amount_paise, booking_id, customer_email)
    # Returns: { 'order_id': '...', 'gateway': '...',  ...gateway-specific-fields }
"""
import uuid
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════
# BASE GATEWAY
# ══════════════════════════════════════════════════════════════════════
class BaseGateway:
    name: str = 'base'

    def create_order(self, amount_paise: int, booking_id: int, customer_email: str) -> dict:
        raise NotImplementedError

    def verify_payment(self, data: dict) -> bool:
        raise NotImplementedError

    def refund(self, payment_id: str, amount_paise: int) -> dict:
        raise NotImplementedError


# ══════════════════════════════════════════════════════════════════════
# 1. DUMMY GATEWAY — Development
# ══════════════════════════════════════════════════════════════════════
class DummyGateway(BaseGateway):
    name = 'dummy'

    def create_order(self, amount_paise: int, booking_id: int, customer_email: str) -> dict:
        order_id = f'DUMMY-{uuid.uuid4().hex[:12].upper()}'
        logger.info(f'[DummyGateway] Created fake order {order_id} for booking {booking_id}')
        return {
            'gateway': self.name,
            'order_id': order_id,
            'amount': amount_paise,
            'currency': 'INR',
            # Frontend should auto-confirm dummy payments immediately
            'auto_confirm': True,
        }

    def verify_payment(self, data: dict) -> bool:
        # Dummy: always succeeds — never call real API
        logger.info(f'[DummyGateway] Auto-verified payment for order {data.get("order_id")}')
        return True

    def refund(self, payment_id: str, amount_paise: int) -> dict:
        refund_id = f'RFND-{uuid.uuid4().hex[:10].upper()}'
        logger.info(f'[DummyGateway] Created fake refund {refund_id} for payment {payment_id}')
        return {'success': True, 'refund_id': refund_id}


# ══════════════════════════════════════════════════════════════════════
# 2. CASHFREE GATEWAY — Sandbox / Staging
# ══════════════════════════════════════════════════════════════════════
class CashfreeGateway(BaseGateway):
    name = 'cashfree'

    def __init__(self):
        import cashfree_pg
        self.cf = cashfree_pg
        env = settings.CASHFREE_ENV  # 'sandbox' or 'production'
        self.cf.XClientId = settings.CASHFREE_APP_ID
        self.cf.XClientSecret = settings.CASHFREE_SECRET_KEY
        self.cf.XEnvironment = (
            cashfree_pg.XEnvironment.SANDBOX
            if env == 'sandbox'
            else cashfree_pg.XEnvironment.PRODUCTION
        )

    def create_order(self, amount_paise: int, booking_id: int, customer_email: str) -> dict:
        from cashfree_pg.models.create_order_request import CreateOrderRequest
        from cashfree_pg.models.customer_details import CustomerDetails
        from cashfree_pg.api.orders_api import OrdersApi

        amount_rupees = amount_paise / 100
        order_id = f'PH-{booking_id}-{uuid.uuid4().hex[:6]}'

        customer = CustomerDetails(
            customer_id=str(booking_id),
            customer_email=customer_email,
            customer_phone='9999999999',  # Required by Cashfree; update with real phone
        )

        order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=amount_rupees,
            order_currency='INR',
            customer_details=customer,
        )

        api = OrdersApi()
        response = api.pg_create_order('2025-01-01', order_request)
        data = response.data

        logger.info(f'[CashfreeGateway] Created order {order_id} for booking {booking_id}')
        return {
            'gateway': self.name,
            'order_id': order_id,
            'payment_session_id': data.payment_session_id,
            'amount': amount_paise,
            'currency': 'INR',
        }

    def verify_payment(self, data: dict) -> bool:
        """Verify via Cashfree order status API."""
        from cashfree_pg.api.orders_api import OrdersApi
        try:
            api = OrdersApi()
            response = api.pg_fetch_order('2025-01-01', data['order_id'])
            return response.data.order_status == 'PAID'
        except Exception as e:
            logger.error(f'[CashfreeGateway] verify failed: {e}')
            return False

    def refund(self, payment_id: str, amount_paise: int) -> dict:
        from cashfree_pg.api.refunds_api import RefundsApi
        from cashfree_pg.models.create_refund_request import CreateRefundRequest
        try:
            api = RefundsApi()
            request = CreateRefundRequest(
                refund_amount=amount_paise / 100,
                refund_id=f'REF-{uuid.uuid4().hex[:6]}',
                refund_note='Customer requested cancellation'
            )
            # Cashfree uses order_id for refunds in some versions, but here we assume session/payment id
            response = api.pg_order_create_refund('2025-01-01', payment_id, request)
            return {'success': True, 'refund_id': response.data.refund_id}
        except Exception as e:
            logger.error(f'[CashfreeGateway] refund failed: {e}')
            return {'success': False, 'error': str(e)}


# ══════════════════════════════════════════════════════════════════════
# 3. RAZORPAY GATEWAY — Production
# ══════════════════════════════════════════════════════════════════════
class RazorpayGateway(BaseGateway):
    name = 'razorpay'

    def __init__(self):
        import razorpay
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    def create_order(self, amount_paise: int, booking_id: int, customer_email: str) -> dict:
        receipt = f'PH-{booking_id}-{uuid.uuid4().hex[:6]}'
        order = self.client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': receipt,
            'payment_capture': 1,
        })
        logger.info(f'[RazorpayGateway] Created order {order["id"]} for booking {booking_id}')
        return {
            'gateway': self.name,
            'order_id': order['id'],
            'key_id': settings.RAZORPAY_KEY_ID,
            'amount': amount_paise,
            'currency': 'INR',
        }

    def verify_payment(self, data: dict) -> bool:
        """Verify Razorpay HMAC signature."""
        import hmac
        import hashlib
        try:
            generated = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                f'{data["razorpay_order_id"]}|{data["razorpay_payment_id"]}'.encode(),
                hashlib.sha256
            ).hexdigest()
            return generated == data.get('razorpay_signature', '')
        except Exception as e:
            logger.error(f'[RazorpayGateway] verify failed: {e}')
            return False

    def refund(self, payment_id: str, amount_paise: int) -> dict:
        try:
            refund = self.client.payment.refund(payment_id, {'amount': amount_paise})
            return {'success': True, 'refund_id': refund['id']}
        except Exception as e:
            logger.error(f'[RazorpayGateway] refund failed: {e}')
            return {'success': False, 'error': str(e)}


# ══════════════════════════════════════════════════════════════════════
# FACTORY
# ══════════════════════════════════════════════════════════════════════
class PaymentGatewayFactory:
    _GATEWAYS = {
        'dummy': DummyGateway,
        'cashfree': CashfreeGateway,
        'razorpay': RazorpayGateway,
    }

    @classmethod
    def get(cls) -> BaseGateway:
        gateway_name = getattr(settings, 'PAYMENT_GATEWAY', 'dummy')
        
        # Safety fallback: force dummy if keys are missing for real gateways
        if gateway_name == 'razorpay' and not settings.RAZORPAY_KEY_ID:
            logger.warning('[PaymentGatewayFactory] RAZORPAY_KEY_ID missing! Falling back to DummyGateway.')
            gateway_name = 'dummy'
        elif gateway_name == 'cashfree' and not settings.CASHFREE_APP_ID:
            logger.warning('[PaymentGatewayFactory] CASHFREE_APP_ID missing! Falling back to DummyGateway.')
            gateway_name = 'dummy'

        logger.info(f'[PaymentGatewayFactory] Fetching active gateway: {gateway_name}')
        gateway_cls = cls._GATEWAYS.get(gateway_name)
        if not gateway_cls:
            raise ValueError(
                f'Unknown PAYMENT_GATEWAY="{gateway_name}". '
                f'Choose from: {list(cls._GATEWAYS.keys())}'
            )
        return gateway_cls()
