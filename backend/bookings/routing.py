"""
WebSocket URL routing for booking slot locking.
Attach to Django Channels via config/asgi.py.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # ws://localhost:8000/ws/slots/<hall_id>/<date>/
    # date format: YYYY-MM-DD
    re_path(
        r'^ws/slots/(?P<hall_id>\d+)/(?P<date>\d{4}-\d{2}-\d{2})/$',
        consumers.SlotLockConsumer.as_asgi()
    ),
]
