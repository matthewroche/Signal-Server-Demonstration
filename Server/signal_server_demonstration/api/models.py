from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save

class Device(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # Identity key length is 44 text characters
    identityKey = models.CharField(max_length=44, blank=False)
    registrationId = models.PositiveIntegerField(blank=False)
    address = models.CharField(max_length=100, blank=False)
    class Meta:
        unique_together = ('user', 'address',)

class PreKey(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    keyId = models.PositiveIntegerField(blank=False)
    # Public key length is 44 text characters
    publicKey = models.CharField(max_length=44, blank=False)

class SignedPreKey(models.Model):
    device = models.OneToOneField(Device, on_delete=models.CASCADE)
    keyId = models.PositiveIntegerField(blank=False)
    # Public key length is 44 text characters
    publicKey = models.CharField(max_length=44, blank=False)
    # Signature length is 88 text characters
    signature = models.CharField(max_length=88, blank=False)

class Message(models.Model):
    recipient = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="received_messages")
    created = models.DateTimeField(auto_now_add=True)
    content = models.CharField(max_length=1000, blank=False)
    sender = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="sent_messages")
    class Meta:
        ordering = ('created',)
