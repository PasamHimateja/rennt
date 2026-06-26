from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
from .push_notifications import send_push_notification
import threading

@receiver(post_save, sender=Notification)
def send_expo_push_on_notification(sender, instance, created, **kwargs):
    if created:
        # Run it in a separate thread so we don't block the HTTP request
        threading.Thread(
            target=send_push_notification,
            args=(instance.recipient_phone, instance.title, instance.message, {"type": instance.type, "related_id": instance.related_id})
        ).start()
