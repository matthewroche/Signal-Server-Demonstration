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
            if not Message.objects.filter(id=messageId).exists():
                return errors.non_existant_message
            else:
                message = Message.objects.get(id=messageId)
                if not message.recipient.user == user:
                    return errors.not_message_owner

        for messageId in messageList:
            message.delete()

        return Response(response, status=status.HTTP_200_OK)

class DeviceMessageList(APIView):

    # User can get a list of messages for their device
    def get(self, request, **kwargs):
        user = self.request.user
        requestedDevice = kwargs['deviceRegistrationId']

        if not user.device_set.filter(registrationId=requestedDevice).exists():
            return Response("Device does not exist", status=status.HTTP_403_FORBIDDEN)
            
        messages = user.device_set.get(registrationId=requestedDevice).received_messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
class UserView(APIView):
    def get(self, request, **kwargs):
        user = self.request.user
        devices = []
        for device in user.device_set.all():
            deviceDict = device.__dict__
            deviceDict['preKeys'] = device.prekey_set.all()
            deviceDict['signedPreKey'] = device.signedprekey
            devices.append(DeviceSerializer(deviceDict).data)
        return Response(devices, status=status.HTTP_200_OK)

class DeviceView(APIView):
    def get(self, request, **kwargs):
        try:
            user = self.request.user
            registrationId = kwargs['deviceRegistrationId']
            device = Device.objects.get(user=user, registrationId=registrationId)
            deviceDict = device.__dict__
            deviceDict['preKeys'] = device.prekey_set.all()
            deviceDict['signedPreKey'] = device.signedprekey
            serializer = DeviceSerializer(deviceDict)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Device.DoesNotExist:
            return errors.no_device
    def post(self, request, **kwargs):

        try:

            user = self.request.user
            registrationId = kwargs['deviceRegistrationId']

            if Device.objects.filter(user=user, registrationId=registrationId).exists():
                return errors.device_exists

            deviceData = request.data
            serializer = DeviceSerializer(data=deviceData, context={'user': user})

            if not serializer.is_valid():
                return errors.invalidData(serializer.errors)
                
            serializer.save()
            return Response({"code": "device_created", "message": "Device successfully created"}, status=status.HTTP_201_CREATED)

        except PermissionDenied:
            return errors.reached_max_devices


    def delete(self, requested, **kwargs):
        user = self.request.user
        registrationId = kwargs['deviceRegistrationId']
        if not Device.objects.filter(user=user, registrationId=registrationId).exists():
            return errors.no_device
        device = Device.objects.get(user=user, registrationId=registrationId)
        device.delete()
        return Response({"code": "device_deleted", "message": "Device successfully deleted"}, status=status.HTTP_204_NO_CONTENT)


class PreKeyBundleView(APIView):
    def get(self, request, **kwargs):

        if not User.objects.filter(username= kwargs['requestedUsername']).exists():
                return Response("User does not exist", status=status.HTTP_403_FORBIDDEN)

        # Get user details object
        user = User.objects.get(username=kwargs['requestedUsername'])

        if not Device.objects.filter(user=user).exists():
            return errors.no_device

        devices = user.device_set.all()
        serialisedDeviceData = []

        # Check prekey available for every device before proceeding
        for device in devices:
            if device.prekey_set.count() == 0:
                # Handle no pre keys available
                return errors.no_prekeys


        for device in devices:

            # Build pre key bundle, removing a preKey from the requested user's list
            preKeyToReturn = device.prekey_set.all()[:1].get()
            signedPreKey = device.signedprekey
        
            preKeyBundle = device.__dict__
            preKeyBundle['preKey'] = preKeyToReturn
            preKeyBundle['signedPreKey'] = signedPreKey
            serializer = PreKeyBundleSerializer(preKeyBundle)

            # Update stored pre key
            preKeyToReturn.delete()

            serialisedDeviceData.append(serializer.data)

        # Return bundle
        return Response(serialisedDeviceData, status=status.HTTP_200_OK)
            
        

class UserPreKeys(APIView):
    def post(self, request, **kwargs):

        try: 

            user = self.request.user
            registrationId = kwargs['deviceRegistrationId']

            if not Device.objects.filter(user=user, registrationId=registrationId).exists():
                return errors.no_device
                
            newPreKeys = request.data['preKeys']

            for x in newPreKeys:
                serializer = PreKeySerializer(data=x, context={'user': user, 'registrationId': registrationId})

                if not serializer.is_valid():
                    return errors.invalidData(serializer.errors)

                serializer.save()

            return Response({"code": "prekeys_stored", "message": "Prekeys successfully stored"}, status=status.HTTP_200_OK)

        except PermissionDenied:
            return errors.reached_max_prekeys
        

class UserSignedPreKeys(APIView):
    def post(self, request, **kwargs):

        user = self.request.user
        registrationId = kwargs['deviceRegistrationId']

        if not Device.objects.filter(user=user, registrationId=registrationId).exists():
            return errors.no_device
            
        device = Device.objects.filter(user=user, registrationId=registrationId).get()
        newSignedPreKey = request.data['signedPreKey']
        serializer = SignedPreKeySerializer(data=newSignedPreKey, context={'user': user, 'registrationId': registrationId})

        if not serializer.is_valid():
            return errors.invalidData(serializer.errors)
            
        device.signedprekey.delete()
        serializer.save()
        return Response({"code": "signed_prekey_stored", "message": "Signed prekey successfully stored"}, status=status.HTTP_200_OK)
            