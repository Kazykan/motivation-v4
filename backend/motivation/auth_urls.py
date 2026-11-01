from django.urls import path
from .views import MeView, RegisterParentView, JoinByCodeView, OAuthLoginView

urlpatterns = [
    path("me/", MeView.as_view()),
    path("register-parent/", RegisterParentView.as_view()),
    path("join-family/", JoinByCodeView.as_view()),
    path("oauth/", OAuthLoginView.as_view()),
]
