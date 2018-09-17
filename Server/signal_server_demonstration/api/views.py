from api.models import Message, UserDetails
from api.serializers import MessageSerializer, UserDetailsSerializer, PreKeyBundleSerializer
from django.http import Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import json
from urllib.parse import unquote, quote


class MessageList(APIView):
    """
    List all messages, or create a new message.
    """
    def get_object(self, pk):
        try:
            return Message.objects.get(pk=pk)
        except Message.DoesNotExist:
            raise Http404

    # User can get a list of messages for which they are the recipient
    def get(self, request, format=None):
        user = self.request.user
        messages = Message.objects.filter(recipient=user).all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    # User can post a message, and they will be defined as the sender
    def post(self, request, format=None):
        user = self.request.user.username
        messageData = request.data
        messageData['sender'] = user
        serializer = MessageSerializer(data=messageData)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # User can delete any message for which they are the recipient
    def delete(self, request, format=None):
        user = self.request.user.username
        message = self.get_object(request.data.get('id'))
        if (message.recipient==user):
            message.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_403_FORBIDDEN)
        
class UserDetail(APIView):
    def get(self, request, format=None):
        user = self.request.user
        userDetails = UserDetails.objects.get(username=user)
        serializer = UserDetailsSerializer(userDetails)
        return Response(serializer.data)
    def post(self, request, format=None):
        user = self.request.user.username
        userAlreadyExists = UserDetails.objects.filter(username=user).count() != 0
        if (userAlreadyExists):
            return Response(status=status.HTTP_403_FORBIDDEN)
        else: 
            userData = request.data
            userData['username'] = user
            serializer = UserDetailsSerializer(data=userData)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, format=None):
        # Todo: Remove this, users should not be able to delete - testing only
        user = self.request.user.username
        userObjects = UserDetails.objects.filter(username=user)
        for obj in userObjects:
            obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PreKeyBundleView(APIView):
    def get(self, request, format=None, **kwargs):

        # Get user details object
        userDetails = UserDetails.objects.get(username=kwargs['requestedUsername'])

        # Build pre key bundle, removing a preKey from the requested user's list
        # The JSON is URL encoded
        preKeys = json.loads(unquote(userDetails.preKeys))
        preKeyToReturn = preKeys.pop(0)
        preKeyBundle = userDetails.__dict__
        preKeyBundle.pop('preKeys')
        preKeyBundle['preKey'] = preKeyToReturn
        serializer = PreKeyBundleSerializer(preKeyBundle)

        # Update stored pre key
        userDetails.preKeys = quote(json.dumps(preKeys))
        userDetails.save()

        # Return bundle
        return Response(serializer.data)

class UserPreKeys(APIView):
    def post(self, request, format=None):
        user = self.request.user.username
        userAlreadyExists = UserDetails.objects.filter(username=user).count() != 0
        if (userAlreadyExists):

            newPreKeys = request.data['preKeys']
            newPreKeys = json.loads(unquote(newPreKeys))
            
            userDetails = UserDetails.objects.get(username=user)
            currentPreKeys = userDetails.preKeys
            currentPreKeys = json.loads(unquote(currentPreKeys))

            currentPreKeys.extend(newPreKeys)
            userDetails.preKeys = quote(json.dumps(currentPreKeys))
            userDetails.save()

            return Response(status=status.HTTP_200_OK)
        else: 
            return Response(status=status.HTTP_400_BAD_REQUEST)

class UserSignedPreKeys(APIView):
    def post(self, request, format=None):
        user = self.request.user.username
        userAlreadyExists = UserDetails.objects.filter(username=user).count() != 0
        if (userAlreadyExists):

            newSignedPreKey = request.data['signedPreKey']
            
            userDetails = UserDetails.objects.get(username=user)
            userDetails.signedPreKey = newSignedPreKey
            userDetails.save()

            return Response(status=status.HTTP_200_OK)
        else: 
            return Response(status=status.HTTP_400_BAD_REQUEST)
            