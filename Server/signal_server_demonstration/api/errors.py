from rest_framework import status
from rest_framework.response import Response

no_profile = Response({
    "code": "no_profile",
    "message": "User has not yet registered a profile"
}, status=status.HTTP_400_BAD_REQUEST)

profile_exists = Response({
    "code": "profile_exists",
    "message": "A profile has already been created for this user"
}, status=status.HTTP_403_FORBIDDEN)

no_prekeys = Response({
    "code": "no_prekeys",
    "message": "No prekeys are available for the requested user"
}, status=status.HTTP_400_BAD_REQUEST)

reached_max_prekeys = Response({
    "code": "reached_max_prekeys",
    "message": "You have reached the maximum number of prekeys. You cannot store more than 100 pre-keys"
}, status=status.HTTP_403_FORBIDDEN)

def invalidData(errors):
    return Response({
        "code": "invalid_data",
        "message": "Invalid data provided",
        "errors": errors
    }, status=status.HTTP_400_BAD_REQUEST)