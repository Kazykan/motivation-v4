from django.urls import path
from .views import MeView, RegisterParentView, JoinByCodeView

urlpatterns = [
    path("me/", MeView.as_view()),
    path("register-parent/", RegisterParentView.as_view()),
    path("join-family/", JoinByCodeView.as_view()),
]
