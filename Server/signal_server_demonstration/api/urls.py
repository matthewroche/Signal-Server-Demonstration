from django.conf.urls import url
from rest_framework.urlpatterns import format_suffix_patterns
from api import views

urlpatterns = [
    url(r'^messages/$', views.MessageList.as_view()),
    url(r'^users/$', views.UserDetail.as_view()),
    url(r'^prekeybundle/(?P<requestedUsername>[0-9a-z]+)/$', views.PreKeyBundleView.as_view()),
    url(r'^prekeys/$', views.UserPreKeys.as_view()),
    url(r'^signedprekey/$', views.UserSignedPreKeys.as_view()),
]

urlpatterns = format_suffix_patterns(urlpatterns)