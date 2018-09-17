from django.db import models

class Message(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    content = models.CharField(max_length=100, blank=False)
    sender = models.CharField(max_length=100, blank=False)
    recipient = models.CharField(max_length=100, blank=False)

    class Meta:
        ordering = ('created',)

class UserDetails(models.Model):
    username = models.CharField(max_length=100, blank=False)
    identityKey = models.CharField(max_length=100, blank=False)
    registrationId = models.CharField(max_length=100, blank=False)
    # Store pre keys in a JSON encoded string
    preKeys = models.CharField(max_length=10000, blank=False)
    signedPreKey = models.CharField(max_length=100, blank=False)
