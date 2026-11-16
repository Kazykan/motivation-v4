from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from motivation.services.push import send_push_to_user
from motivation.models import PushSubscription
from .permissions import ServiceOrUserPermission, _is_authenticated


class PushSubscribeView(APIView):
    permission_classes = [ServiceOrUserPermission]

    def post(self, request):
        if not _is_authenticated(request):
            return Response({"detail": "Требуется вход."}, status=401)

        endpoint = request.data.get("endpoint")
        p256dh = request.data.get("p256dh")
        auth = request.data.get("auth")

        if not endpoint or not p256dh or not auth:
            return Response(
                {"detail": "endpoint, p256dh и auth обязательны."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sub, _ = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={"user": request.user, "p256dh": p256dh, "auth": auth},
        )
        return Response({"id": sub.pk}, status=status.HTTP_200_OK)


class PushUnsubscribeView(APIView):
    permission_classes = [ServiceOrUserPermission]

    def post(self, request):
        if not _is_authenticated(request):
            return Response({"detail": "Требуется вход."}, status=401)

        endpoint = request.data.get("endpoint")
        if not endpoint:
            return Response(
                {"detail": "endpoint обязателен."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        PushSubscription.objects.filter(endpoint=endpoint, user=request.user).delete()
        return Response({"ok": True}, status=status.HTTP_200_OK)


class PushTestView(APIView):
    permission_classes = [ServiceOrUserPermission]

    def post(self, request):
        if not _is_authenticated(request):
            return Response({"detail": "Требуется вход."}, status=401)

        if not PushSubscription.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Нет активных подписок. Включите уведомления."},
                status=400,
            )

        sent = send_push_to_user(
            request.user,
            "Проверка уведомлений",
            "Push-уведомления работают 🎉",
            url="/",
        )
        if sent == 0:
            return Response(
                {
                    "detail": "Не удалось отправить. Проверьте настройки VAPID на сервере."
                },
                status=502,
            )
        return Response({"ok": True, "sent": sent})
