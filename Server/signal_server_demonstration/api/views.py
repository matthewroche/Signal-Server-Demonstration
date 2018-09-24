from api.models import Message, Profile, PreKey, SignedPreKey
from django.contrib.auth.models import User
from api.serializers import MessageSerializer, ProfileSerializer, PreKeyBundleSerializer, PreKeySerializer, SignedPreKeySerializer
from django.core.exceptions import PermissionDenied

from django.http import Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from api import errors

import json
from urllib.parse import unquote, quote


class MessageList(APIView):
    def get_object(self, pk):
        try:
            return Message.objects.get(pk=pk)
        except Message.DoesNotExist:
            raise Http404

    # User can get a list of messages for which they are the recipient
    def get(self, request):
        user = self.request.user
        messages = Message.objects.filter(recipient=user).all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    # User can post a message, and they will be defined as the sender
    def post(self, request):
        user = self.request.user.username
        messageData = request.data
        messageData['sender'] = user
        serializer = MessageSerializer(data=messageData)
        if not serializer.is_valid():
            return errors.invalidData(serializer.errors)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # User can delete any message for which they are the recipient
    def delete(self, request):
        user = self.request.user.username
        message = self.get_object(request.data.get('id'))
        if (message.recipient==user):
            message.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_403_FORBIDDEN)
        
class ProfileView(APIView):
    def get(self, request):
        try:
            user = self.request.user
            profile = Profile.objects.get(user=user)
            profileDict = profile.__dict__
            profileDict['preKeys'] = profile.prekey_set.all()
            profileDict['signedPreKey'] = profile.signedprekey
            serializer = ProfileSerializer(profileDict)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Profile.DoesNotExist:
            return errors.no_profile
    def post(self, request):

        user = self.request.user

        if Profile.objects.filter(user=user).exists():
            return errors.profile_exists

        userData = request.data
        serializer = ProfileSerializer(data=userData, context={'user': user})

        if not serializer.is_valid():
            return errors.invalidData(serializer.errors)
            
        serializer.save()
        return Response({"code": "profile_created", "message": "Profile successfully created"}, status=status.HTTP_201_CREATED)

    def delete(self, requested):
        user = self.request.user
        if not Profile.objects.filter(user=user).exists():
            return errors.no_profile
        profile = Profile.objects.get(user=user)
        profile.delete()
        return Response({"code": "profile_deleted", "message": "Profile successfully deleted"}, status=status.HTTP_204_NO_CONTENT)


class PreKeyBundleView(APIView):
    def get(self, request, **kwargs):

        # Get user details object
        user = User.objects.get(username=kwargs['requestedUsername'])

        if not Profile.objects.filter(user=user).exists():
            return errors.no_profile

        profile = user.profile

        if profile.prekey_set.count() == 0:
            # Handle no pre keys available
            return errors.no_prekeys

        # Build pre key bundle, removing a preKey from the requested user's list
        preKeyToReturn = profile.prekey_set.all()[:1].get()
        signedPreKey = profile.signedprekey

        preKeyBundle = profile.__dict__
        preKeyBundle['preKey'] = preKeyToReturn
        preKeyBundle['signedPreKey'] = signedPreKey
        serializer = PreKeyBundleSerializer(preKeyBundle)

        # Update stored pre key
        preKeyToReturn.delete()

        # Return bundle
        return Response(serializer.data, status=status.HTTP_200_OK)
            
        

class UserPreKeys(APIView):
    def post(self, request):

        try: 

            user = self.request.user

            if not Profile.objects.filter(user=user).exists():
                return errors.no_profile
                
            newPreKeys = request.data['preKeys']

            for x in newPreKeys:
                serializer = PreKeySerializer(data=x, context={'user': user})

                if not serializer.is_valid():
                    return errors.invalidData(serializer.errors)

                serializer.save()

            return Response({"code": "prekeys_stored", "message": "Prekeys successfully stored"}, status=status.HTTP_200_OK)

        except PermissionDenied:
            return errors.reached_max_prekeys
        

class UserSignedPreKeys(APIView):
    def post(self, request):

        user = self.request.user

        if not Profile.objects.filter(user=user).exists():
            return errors.no_profile
            
        newSignedPreKey = request.data['signedPreKey']
        serializer = SignedPreKeySerializer(data=newSignedPreKey, context={'user': user})

        if not serializer.is_valid():
            return errors.invalidData(serializer.errors)
            
        user.profile.signedprekey.delete()
        serializer.save()
        return Response({"code": "signed_prekey_stored", "message": "Signed prekey successfully stored"}, status=status.HTTP_200_OK)
            