from django.urls import path, include
from rest_framework.routers import DefaultRouter

from motivation.views.push import PushTestView
from motivation.views.cron import CronDispatchView
from .views import (
    UserViewSet,
    FamilyInviteCodeViewSet,
    TaskViewSet,
    TaskLogViewSet,
    WeeklyReportViewSet,
    PushSubscribeView,
    PushUnsubscribeView,
)


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"invites", FamilyInviteCodeViewSet, basename="invite")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"task-logs", TaskLogViewSet, basename="task-log")
router.register(r"weekly-reports", WeeklyReportViewSet, basename="weekly-report")


urlpatterns = [
    path("", include(router.urls)),
    path("cron/<str:job>/", CronDispatchView.as_view()),
    path("push/subscribe/", PushSubscribeView.as_view(), name="push-subscribe"),
    path("push/unsubscribe/", PushUnsubscribeView.as_view(), name="push-unsubscribe"),
    path("push/test/", PushTestView.as_view(), name="push-test"),
]