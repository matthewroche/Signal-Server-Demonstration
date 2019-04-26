from django.conf.urls import url, include
from api import views

urlpatterns = [
    url(r'^messages/$', views.MessageList.as_view()),
    url(r'^device/(?P<deviceRegistrationId>[0-9]+)/$', views.DeviceView.as_view()),
    url(r'^prekeybundle/(?P<requestedUsername>[0-9a-z]+)/$', views.PreKeyBundleView.as_view()),
    url(r'^prekeys/$', views.UserPreKeys.as_view()),
    url(r'^signedprekey/$', views.UserSignedPreKeys.as_view()),
    url(r'^auth/', include('djoser.urls')),
    url(r'^auth/', include('djoser.urls.jwt')),
]