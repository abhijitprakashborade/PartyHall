"""
ASGI config for Party Hall SaaS Platform
Supports: HTTP (Django) + WebSocket (Django Channels)
"""
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import bookings.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI app early to populate the app registry before
# importing routing modules that depend on models.
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    # Standard Django HTTP requests
    'http': django_asgi_app,

    # WebSocket connections — slot locking events
    'websocket': AuthMiddlewareStack(
        URLRouter(
            bookings.routing.websocket_urlpatterns
        )
    ),
})
