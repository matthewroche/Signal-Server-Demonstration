from api.models import Message, Device, PreKey, SignedPreKey
from django.contrib.auth.models import User
from api.serializers import MessageSerializer, DeviceSerializer, PreKeyBundleSerializer, PreKeySerializer, SignedPreKeySerializer
from django.core.exceptions import PermissionDenied

from django.http import Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from api import errors

import json
from urllib.parse import unquote, quote


class MessageList(APIView):

    # User can get a list of messages for their device
    def get(self, request, **kwargs):
        user = self.request.user

        # Check device exists and owned by user
        if not hasattr(user, "device"):
            return Response("Device does not exist", status=status.HTTP_403_FORBIDDEN)
            
        messages = user.device.received_messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # User can post multiple messages. They will be defined as the sender
    def post(self, request):

        user = self.request.user
        messageData = request.data
        response = []

        for message in messageData:

            # Get sender's device object
            if not Device.objects.filter(address= message['senderAddress']).exists():
                return Response("Sender device does not exist", status=status.HTTP_403_FORBIDDEN)
            senderDevice = Device.objects.get(address= message['senderAddress'])

            # Get recipient's device object
            if not Device.objects.filter(address= message['recipientAddress']).exists():
                return Response("Recipient device does not exist", status=status.HTTP_403_FORBIDDEN)
            recipientDevice = Device.objects.get(address= message['recipientAddress'])

            serializer = MessageSerializer(data=message, context={'senderDevice': senderDevice, 'recipientDevice': recipientDevice})
            if not serializer.is_valid():
                response.append(serializer.errors)
            else: 
                serializer.save()
                response.append(serializer.data)

        return Response(response, status=status.HTTP_201_CREATED)

    # User can delete any message for which they are the recipient
    def delete(self, request):
        user = self.request.user
        messageList = request.data
        response = []

        for messageId in messageList:
            # Check message exists
            if not Message.objects.filter(id=messageId).exists():
                return errors.non_existant_message
            else:
                message = Message.objects.get(id=messageId)
                # Check user owns meaage
                if not message.recipient.user == user:
                    return errors.not_message_owner

        for messageId in messageList:
            message = Message.objects.get(id=messageId)
            message.delete()

        return Response(response, status=status.HTTP_200_OK)

class DeviceView(APIView):

    # User can register details of a new device
    def post(self, request, **kwargs):

        try:

            user = self.request.user
            registrationId = kwargs['deviceRegistrationId']

            # Check device does not already exist
            if hasattr(user, "device"):
                return errors.device_exists

            deviceData = request.data
            serializer = DeviceSerializer(data=deviceData, context={'user': user})

            if not serializer.is_valid():
                return errors.invalidData(serializer.errors)
                
            serializer.save()
            return Response({"code": "device_created", "message": "Device successfully created"}, status=status.HTTP_201_CREATED)

        except PermissionDenied:
            return errors.reached_max_devices

    # User can delete a device they own
    def delete(self, requested, **kwargs):
        user = self.request.user
        # Check device exists and owned by user
        if not hasattr(user, "device"):
            return errors.no_device
        device = user.device
        device.delete()
        return Response({"code": "device_deleted", "message": "Device successfully deleted"}, status=status.HTTP_204_NO_CONTENT)


class PreKeyBundleView(APIView):
    # User can optain a preKeyBundle from another user
    def get(self, request, **kwargs):

        # Check user exists
        if not User.objects.filter(username= kwargs['requestedUsername']).exists():
                return Response("User does not exist", status=status.HTTP_403_FORBIDDEN)

        # Get user details object
        user = User.objects.get(username=kwargs['requestedUsername'])

        # Check user has a registered device
        if not hasattr(user, "device"):
            return errors.no_device

        device = user.device

        # Check prekey available for device before proceeding
        if device.prekey_set.count() == 0:
            # Handle no pre keys available for device - throw an error for security
            return errors.no_prekeys

        # Build pre key bundle, removing a preKey from the requested user's list
        preKeyToReturn = device.prekey_set.all()[:1].get()
        signedPreKey = device.signedprekey
    
        preKeyBundle = device.__dict__
        preKeyBundle['preKey'] = preKeyToReturn
        preKeyBundle['signedPreKey'] = signedPreKey
        serializer = PreKeyBundleSerializer(preKeyBundle)

        # Update stored pre key
        preKeyToReturn.delete()

        # Return bundle
        return Response(serializer.data, status=status.HTTP_200_OK)
            
        

class UserPreKeys(APIView):

    # User can post a new set of preKeys
    def post(self, request, **kwargs):

        try: 

            user = self.request.user

            # Check device exiss and owned by user
            if not hasattr(user, "device"):
                return errors.no_device
                
            newPreKeys = request.data['preKeys']

            for x in newPreKeys:
                serializer = PreKeySerializer(data=x, context={'user': user, 'registrationId': user.device.registrationId})

                if not serializer.is_valid():
                    return errors.invalidData(serializer.errors)

                serializer.save()

            return Response({"code": "prekeys_stored", "message": "Prekeys successfully stored"}, status=status.HTTP_200_OK)

        except PermissionDenied:
            return errors.reached_max_prekeys
        

class UserSignedPreKeys(APIView):
    # User can post a new signedPreKey
    def post(self, request, **kwargs):

        user = self.request.user

        # Check device exists and owned by user
        if not hasattr(user, "device"):
            return errors.no_device
            
        device = user.device
        newSignedPreKey = request.data['signedPreKey']
        serializer = SignedPreKeySerializer(data=newSignedPreKey, context={'user': user, 'registrationId': device.registrationId})

        if not serializer.is_valid():
            return errors.invalidData(serializer.errors)
            
        device.signedprekey.delete()
        serializer.save()
        return Response({"code": "signed_prekey_stored", "message": "Signed prekey successfully stored"}, status=status.HTTP_200_OK)
            