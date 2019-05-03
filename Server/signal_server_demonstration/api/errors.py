from rest_framework import status
from rest_framework.response import Response

no_user = Response({
    "code": "no_user",
    "message": "User does not exist"
}, status=status.HTTP_400_BAD_REQUEST)

no_recipient = Response({
    "code": "no_recipient",
    "message": "One of the messages you sent has a non-existent user"
}, status=status.HTTP_400_BAD_REQUEST)

no_device = Response({
    "code": "no_device",
    "message": "User has not yet registered a device"
}, status=status.HTTP_400_BAD_REQUEST)

no_recipient_device = Response({
    "code": "no_device",
    "message": "Recipient has not yet registered a device"
}, status=status.HTTP_400_BAD_REQUEST)

device_exists = Response({
    "code": "device_exists",
    "message": "A device has already been created for this user"
}, status=status.HTTP_403_FORBIDDEN)

no_prekeys = Response({
    "code": "no_prekeys",
    "message": "No prekeys are available for the requested device"
}, status=status.HTTP_400_BAD_REQUEST)

non_existant_message = Response({
    "code": "non-existant_message",
    "message": "One of the messages you are trying to delete does not exist"
}, status=status.HTTP_403_FORBIDDEN)

not_message_owner = Response({
    "code": "not_message_owner",
    "message": "You do not own one of the messages you are trying to delete"
}, status=status.HTTP_403_FORBIDDEN)

incorrect_arguments = Response({
    "code": "incorrect_arguments",
    "message": "Incorrect arguments were provided to the API call"
}, status=status.HTTP_403_FORBIDDEN)

device_changed = Response({
    "code": "device_changed",
    "message": "Own device has changed"
}, status=status.HTTP_403_FORBIDDEN)

recipient_identity_changed = Response({
    "code": "recipient_identity_changed",
    "message": "Recipients device has changed"
}, status=status.HTTP_403_FORBIDDEN)

def invalidData(errors):
    return Response({
        "code": "invalid_data",
        "message": "Invalid data provided",
        "errors": errors
    }, status=status.HTTP_400_BAD_REQUEST)