from rest_framework import serializers
from api.models import Message, UserDetails

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('id', 'created', 'content', 'sender', 'recipient')

class UserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDetails
        fields = ('username', 'identityKey', 'registrationId', 'preKeys', 'signedPreKey')

class PreKeyBundleSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=200)
    identityKey = serializers.CharField(max_length=200)
    registrationId = serializers.CharField(max_length=200)
    preKey = serializers.CharField(max_length=200)
    signedPreKey = serializers.CharField(max_length=200)

