from rest_framework import status
from rest_framework.response import Response

no_device = Response({
    "code": "no_device",
    "message": "User has not yet registered this device"
}, status=status.HTTP_400_BAD_REQUEST)

device_exists = Response({
    "code": "device_exists",
    "message": "A device with this registrationId has already been created for this user"
}, status=status.HTTP_403_FORBIDDEN)

no_prekeys = Response({
    "code": "no_prekeys",
    "message": "No prekeys are available for the requested device"
}, status=status.HTTP_400_BAD_REQUEST)

reached_max_prekeys = Response({
    "code": "reached_max_prekeys",
    "message": "You have reached the maximum number of prekeys. You cannot store more than 100 prekeys"
}, status=status.HTTP_403_FORBIDDEN)

reached_max_devices = Response({
    "code": "reached_max_devices",
    "message": "You have reached the maximum number of devices. You cannot register more than three devices"
}, status=status.HTTP_403_FORBIDDEN)

def invalidData(errors):
    return Response({
        "code": "invalid_data",
        "message": "Invalid data provided",
        "errors": errors
    }, status=status.HTTP_400_BAD_REQUEST)