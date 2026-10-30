# backend/motivation/authentication.py
import base64
import hmac

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

from init_data_py import errors as init_errors
from init_data_py import validate_by_hash

User = get_user_model()


class BFFServiceAuthentication(authentication.BaseAuthentication):
    """
    Basic-auth для доверенного сервиса (Next.js BFF).

    Заголовок Authorization: Basic base64(login:password).
    Возвращает (None, None) — это не пользователь, а пропуск доступа.
    Реальный пользователь приходит через X-Telegram-Init-Data.
    """

    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.lower().startswith("basic "):
            return None

        expected_user = settings.BFF_SERVICE_USERNAME
        expected_pass = settings.BFF_SERVICE_PASSWORD
        if not expected_user or not expected_pass:
            raise exceptions.AuthenticationFailed(
                "Сервисные креды не сконфигурированы."
            )

        try:
            decoded = base64.b64decode(auth.split(" ", 1)[1]).decode()
            username, password = decoded.split(":", 1)
        except Exception:
            raise exceptions.AuthenticationFailed("Некорректный Basic-заголовок.")

        ok_user = hmac.compare_digest(username, expected_user)
        ok_pass = hmac.compare_digest(password, expected_pass)
        if not (ok_user and ok_pass):
            raise exceptions.AuthenticationFailed("Неверные сервисные креды.")

        # Пропускаем дальше. request.user = AnonymousUser,
        # но permission-класс ниже разрешит запрос.
        return (None, "bff-service")


class TelegramInitDataAuthentication(authentication.BaseAuthentication):
    keyword = "tma"

    def authenticate(self, request):
        raw = request.META.get("HTTP_X_TELEGRAM_INIT_DATA")
        if not raw:
            auth_header = request.META.get("HTTP_AUTHORIZATION", "")
            if auth_header.lower().startswith(self.keyword + " "):
                raw = auth_header[len(self.keyword) + 1 :]

        if not raw:
            return None

        bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        if not bot_token:
            raise exceptions.AuthenticationFailed("TELEGRAM_BOT_TOKEN не задан.")

        try:
            init_data = validate_by_hash(raw, bot_token, expires_in=86400)
        except init_errors.ExpiredError:
            raise exceptions.AuthenticationFailed("initData устарел.")
        except init_errors.InvalidInitDataError as e:
            raise exceptions.AuthenticationFailed(f"Невалидный initData: {e}")

        tg_user = init_data.user
        if not tg_user:
            raise exceptions.AuthenticationFailed("В initData нет user.")

        user, _ = User.objects.get_or_create(
            telegram_id=tg_user.id,
            defaults={
                "username": f"tg_{tg_user.id}",
                "first_name": tg_user.first_name or "",
                "last_name": tg_user.last_name or "",
                "role": User.Role.CHILD,
            },
        )
        return (user, None)
