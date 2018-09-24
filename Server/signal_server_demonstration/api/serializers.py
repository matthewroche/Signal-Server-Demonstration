from rest_framework import serializers
from api.models import Message, Profile, PreKey, SignedPreKey
from django.core.exceptions import PermissionDenied

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('id', 'created', 'content', 'sender', 'recipient')

class PreKeySerializer(serializers.Serializer):
    keyId = serializers.IntegerField(min_value=0, max_value= 999999)
    publicKey = serializers.CharField(max_length=33, min_length=33)
    def create(self, validated_data):
        user = self.context['user']
        profileReference = Profile.objects.filter(user=user).get()
        # Limit to max 100 prekeys
        if profileReference.prekey_set.count() > 99:
            raise PermissionDenied()
        return PreKey.objects.create(owner=profileReference, **validated_data)

class SignedPreKeySerializer(serializers.Serializer):
    keyId = serializers.IntegerField(min_value=0, max_value=999999)
    publicKey = serializers.CharField(max_length=33, min_length=33)
    signature = serializers.CharField(max_length=64, min_length=64)
    def create(self, validated_data):
        user = self.context['user']
        profileReference = Profile.objects.filter(user=user).get()
        return SignedPreKey.objects.create(owner=profileReference, **validated_data)

class ProfileSerializer(serializers.Serializer):
    identityKey = serializers.CharField(max_length=33, min_length=33)
    registrationId = serializers.IntegerField(min_value=0, max_value=999999)
    preKeys = PreKeySerializer(many=True)
    signedPreKey = SignedPreKeySerializer()
    def create(self, validated_data):
        user = self.context['user']
        signedPreKey = validated_data.pop('signedPreKey')
        preKeys = validated_data.pop('preKeys')
        profileReference = Profile.objects.create(user=user, **validated_data)
        SignedPreKey.objects.create(owner = profileReference, **signedPreKey)
        for x in preKeys:
            PreKey.objects.create(owner = profileReference, **x)
        return profileReference

class PreKeyBundleSerializer(serializers.Serializer):
    identityKey = serializers.CharField(max_length=33, min_length=33)
    registrationId = serializers.IntegerField(min_value=0, max_value=999999)
    preKey = PreKeySerializer()
    signedPreKey = SignedPreKeySerializer()

