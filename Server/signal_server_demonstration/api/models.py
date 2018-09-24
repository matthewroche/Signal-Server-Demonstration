from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save

class Message(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    content = models.CharField(max_length=100, blank=False)
    sender = models.CharField(max_length=100, blank=False)
    recipient = models.CharField(max_length=100, blank=False)

    class Meta:
        ordering = ('created',)

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # Identity key length is 33 text characters
    identityKey = models.CharField(max_length=33, blank=False)
    registrationId = models.PositiveIntegerField(blank=False)

class PreKey(models.Model):
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE)
    keyId = models.PositiveIntegerField(blank=False)
    # Public key length is 33 text characters
    publicKey = models.CharField(max_length=33, blank=False)

class SignedPreKey(models.Model):
    owner = models.OneToOneField(Profile, on_delete=models.CASCADE)
    keyId = models.PositiveIntegerField(blank=False)
    # Public key length is 33 text characters
    publicKey = models.CharField(max_length=33, blank=False)
    # Signature length is 64 text characters
    signature = models.CharField(max_length=64, blank=False)
