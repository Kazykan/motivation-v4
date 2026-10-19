from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    FamilyInviteCodeViewSet,
    TaskViewSet,
    TaskLogViewSet,
    WeeklyReportViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"invites", FamilyInviteCodeViewSet, basename="invite")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"task-logs", TaskLogViewSet, basename="task-log")
router.register(r"weekly-reports", WeeklyReportViewSet, basename="weekly-report")

urlpatterns = [
    path("", include(router.urls)),
]
