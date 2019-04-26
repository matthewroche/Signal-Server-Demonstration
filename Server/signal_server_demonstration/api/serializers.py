from rest_framework import serializers
from api.models import Message, Device, PreKey, SignedPreKey
from django.core.exceptions import PermissionDenied

class MessageSerializer(serializers.Serializer):
    id = serializers.ReadOnlyField()
    senderAddress = serializers.SerializerMethodField('get_sender_address')
    content = serializers.CharField(max_length=1000, min_length=0)
    recipientAddress = serializers.SerializerMethodField('get_recipient_address')
    def create(self, validated_data):
        senderDevice = self.context['senderDevice']
        recipientDevice = self.context['recipientDevice']
        return Message.objects.create(recipient=recipientDevice, sender=senderDevice, **validated_data)
    def get_sender_address(self, obj):
        return obj.sender.address
    def get_recipient_address(self, obj):
        return obj.recipient.address

class PreKeySerializer(serializers.Serializer):
    keyId = serializers.IntegerField(min_value=0, max_value= 999999)
    publicKey = serializers.CharField(max_length=44, min_length=44)
    def create(self, validated_data):
        user = self.context['user']
        registrationId = self.context['registrationId']
        deviceReference = Device.objects.filter(user=user, registrationId=registrationId).get()
        # Limit to max 100 prekeys
        if deviceReference.prekey_set.count() > 99:
            raise PermissionDenied()
        return PreKey.objects.create(device=deviceReference, **validated_data)

class SignedPreKeySerializer(serializers.Serializer):
    keyId = serializers.IntegerField(min_value=0, max_value=999999)
    publicKey = serializers.CharField(max_length=44, min_length=44)
    signature = serializers.CharField(max_length=88, min_length=88)
    def create(self, validated_data):
        user = self.context['user']
        registrationId = self.context['registrationId']
        deviceReference = Device.objects.filter(user=user, registrationId=registrationId).get()
        return SignedPreKey.objects.create(device=deviceReference, **validated_data)

class DeviceSerializer(serializers.Serializer):
    identityKey = serializers.CharField(max_length=44, min_length=44)
    address = serializers.CharField(max_length=100)
    registrationId = serializers.IntegerField(min_value=0, max_value=999999)
    preKeys = PreKeySerializer(many=True)
    signedPreKey = SignedPreKeySerializer()
    def create(self, validated_data):
        user = self.context['user']
        # Limit to max 1 device for security reasons
        if hasattr(user, "device"):
            raise PermissionDenied()
        signedPreKey = validated_data.pop('signedPreKey')
        preKeys = validated_data.pop('preKeys')
        deviceReference = Device.objects.create(user=user, **validated_data)
        SignedPreKey.objects.create(device=deviceReference, **signedPreKey)
        for x in preKeys:
            PreKey.objects.create(device=deviceReference, **x)
        return deviceReference

class PreKeyBundleSerializer(serializers.Serializer):
    address = serializers.CharField(max_length=100, min_length=1)
    identityKey = serializers.CharField(max_length=33, min_length=33)
    registrationId = serializers.IntegerField(min_value=0, max_value=999999)
    preKey = PreKeySerializer()
    signedPreKey = SignedPreKeySerializer()

