"""
WebSocket consumer for real-time slot locking.

When a user starts filling in the booking form for a specific hall+date+time:
  → They join the group and "lock" that slot
  → All other users in the same group see the slot as "pending"
  → On disconnect / timeout → slot unlocks automatically

Channel group name pattern: slots_{hall_id}_{date}
Message types:
  { type: "slot.lock",   slot_id, locked_by }
  { type: "slot.unlock", slot_id }
  { type: "slot.status", slots: [{slot_id, status, locked_by}] }
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class SlotLockConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.hall_id = self.scope['url_route']['kwargs']['hall_id']
        self.date = self.scope['url_route']['kwargs']['date']
        self.group_name = f'slots_{self.hall_id}_{self.date}'
        self.locked_slot = None

        # Join the group for this hall+date
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        # Send current slot statuses from Redis
        statuses = await self.get_slot_statuses()
        await self.send(text_data=json.dumps({
            'type': 'slot.status',
            'slots': statuses
        }))

    async def disconnect(self, close_code):
        # Release any lock this user held
        if self.locked_slot:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'slot_unlock',
                    'slot_id': self.locked_slot,
                }
            )
            self.locked_slot = None

        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        slot_id = data.get('slot_id')

        if action == 'lock' and slot_id:
            # Release previous lock first
            if self.locked_slot and self.locked_slot != slot_id:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'slot_unlock',
                        'slot_id': self.locked_slot,
                    }
                )

            self.locked_slot = slot_id

            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'slot_lock',
                    'slot_id': slot_id,
                    'locked_by': self.channel_name[-8:],  # anonymised ID
                }
            )

        elif action == 'unlock' and slot_id:
            if self.locked_slot == slot_id:
                self.locked_slot = None
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'slot_unlock',
                        'slot_id': slot_id,
                    }
                )

    # ── Group message handlers (called on every member in the group) ──────

    async def slot_lock(self, event):
        await self.send(text_data=json.dumps({
            'type': 'slot.lock',
            'slot_id': event['slot_id'],
            'locked_by': event.get('locked_by'),
        }))

    async def slot_unlock(self, event):
        await self.send(text_data=json.dumps({
            'type': 'slot.unlock',
            'slot_id': event['slot_id'],
        }))

    @database_sync_to_async
    def get_slot_statuses(self):
        """Return current DB statuses for all slots on this hall+date."""
        try:
            from bookings.models import Booking
            bookings = Booking.objects.filter(
                hall_id=self.hall_id,
                date=self.date
            ).values('time_slot', 'status')
            return [
                {'slot_id': b['time_slot'], 'status': b['status']}
                for b in bookings
            ]
        except Exception:
            return []
