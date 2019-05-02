from django.conf.urls import url, include
from api import views

urlpatterns = [
    url(r'^messages/(?P<requestedDeviceRegistrationID>[0-9]+)/$', views.MessageList.as_view()),
    url(r'^device/', views.DeviceView.as_view()),
    url(r'^prekeybundle/(?P<recipientUsername>[0-9a-z]+)/(?P<ownDeviceRegistrationID>[0-9]+)/$', views.PreKeyBundleView.as_view()),
    url(r'^prekeys/(?P<requestedDeviceRegistrationID>[0-9]+)/$', views.UserPreKeys.as_view()),
    url(r'^signedprekey/(?P<requestedDeviceRegistrationID>[0-9]+)/$', views.UserSignedPreKeys.as_view()),
    url(r'^auth/', include('djoser.urls')),
    url(r'^auth/', include('djoser.urls.jwt')),
]