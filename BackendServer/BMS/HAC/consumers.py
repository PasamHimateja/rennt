import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_phone = self.scope['url_route']['kwargs'].get('user_phone')
        self.admin_group = "admin_notifications"
        self.public_group = "public_updates"
        
        # Join admin and public groups
        await self.channel_layer.group_add(self.admin_group, self.channel_name)
        await self.channel_layer.group_add(self.public_group, self.channel_name)
        
        # Join personalized group if phone is provided
        if self.user_phone:
            sanitized_phone = self.user_phone.replace("@", "_").replace(".", "_")
            self.personal_group = f"user_notifications_{sanitized_phone}"
            await self.channel_layer.group_add(self.personal_group, self.channel_name)
            print(f"[WS] User connected: {self.user_phone} (Group: {self.personal_group})")
        else:
            self.personal_group = None
            print(f"[WS] Admin connected to global notifications")

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.admin_group, self.channel_name)
        await self.channel_layer.group_discard(self.public_group, self.channel_name)
        if hasattr(self, 'personal_group') and self.personal_group:
            await self.channel_layer.group_discard(self.personal_group, self.channel_name)
        print(f"[WS] Disconnected: {self.channel_name}")

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event["content"]))

class OwnerStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.phone = self.scope['url_route']['kwargs'].get('phone')
        if not self.phone:
            await self.close()
            return

        # Sanitize phone for group name (alphanumeric and underscores only)
        # Using a simple replacement for @ and .
        sanitized_phone = self.phone.replace("@", "_").replace(".", "_")
        self.group_name = f"owner_status_{sanitized_phone}"

        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        print(f"[WS] Owner connected to status updates: {self.phone} ({self.group_name})")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            print(f"[WS] Owner disconnected from status updates: {self.phone}")

    # Receive message from room group
    async def status_update(self, event):
        # Send message to WebSocket
        # Message format: {"type": "status_update", "status": "active", "reason": "..."}
        await self.send(text_data=json.dumps(event["content"]))

