from rest_framework import serializers
from api.models import Message, Device, PreKey, SignedPreKey
from django.core.exceptions import PermissionDenied

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('id', 'created', 'content', 'sender', 'recipient')

class PreKeySerializer(serializers.Serializer):
    keyId = serializers.IntegerField(min_value=0, max_value= 999999)
    publicKey = serializers.CharField(max_length=33, min_length=32)
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
    publicKey = serializers.CharField(max_length=33, min_length=32)
    signature = serializers.CharField(max_length=64, min_length=63)
    def create(self, validated_data):
        user = self.context['user']
        registrationId = self.context['registrationId']
        deviceReference = Device.objects.filter(user=user, registrationId=registrationId).get()
        return SignedPreKey.objects.create(device=deviceReference, **validated_data)

class DeviceSerializer(serializers.Serializer):
    identityKey = serializers.CharField(max_length=33, min_length=32)
    registrationId = serializers.IntegerField(min_value=0, max_value=999999)
    preKeys = PreKeySerializer(many=True)
    signedPreKey = SignedPreKeySerializer()
    def create(self, validated_data):
        user = self.context['user']
        # Limit to max 3 devices
        if user.device_set.count() > 2:
            raise PermissionDenied()
        signedPreKey = validated_data.pop('signedPreKey')
        preKeys = validated_data.pop('preKeys')
        deviceReference = Device.objects.create(user=user, **validated_data)
        SignedPreKey.objects.create(device=deviceReference, **signedPreKey)
        for x in preKeys:
            PreKey.objects.create(device=deviceReference, **x)
        return deviceReference

class PreKeyBundleSerializer(serializers.Serializer):
    identityKey = serializers.CharField(max_length=33, min_length=32)
    registrationId = serializers.IntegerField(min_value=0, max_value=999999)
    preKey = PreKeySerializer()
    signedPreKey = SignedPreKeySerializer()

