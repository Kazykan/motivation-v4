from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings
from init_data_py import validate_by_hash
from init_data_py.errors import InvalidInitDataError

User = get_user_model()


class TelegramInitDataAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None

        try:
            token_type, init_data_raw = auth_header.split(" ")
            if token_type.lower() != "tma":
                return None
        except ValueError:
            return None

        bot_token = settings.TELEGRAM_BOT_TOKEN
        if not bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN не задан в переменных окружения.")

        try:
            init_data = validate_by_hash(init_data_raw, bot_token)

            telegram_user = init_data.user
            if not telegram_user:
                raise AuthenticationFailed(
                    "В initData отсутствуют данные пользователя."
                )

            user, _ = User.objects.get_or_create(
                telegram_id=telegram_user.id,
                defaults={
                    "username": f"tg_{telegram_user.id}",
                    "first_name": telegram_user.first_name or "",
                    "last_name": telegram_user.last_name or "",
                    "role": User.Role.CHILD,
                },
            )
            return (user, None)

        except InvalidInitDataError as e:
            raise AuthenticationFailed(f"Ошибка валидации Telegram данных: {str(e)}")
