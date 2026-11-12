# backend/motivation/views/auth.py
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from motivation.models import (
    User,
    FamilyGroup,
    FamilyMembership,
    FamilyInviteCode,
)
from motivation.serializers import FamilyJoinSerializer

PROVIDER_FIELDS = {
    "google": "google_id",
    "vk": "vk_id",
    "apple": "apple_id",
}


def _user_payload(user: User, invite_code: str | None = None) -> dict:
    membership = user.family_memberships.select_related("family").first()  # type: ignore[override]
    payload = {
        "id": user.id,  # type: ignore[override]
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "onboarded": bool(user.role) and membership is not None,
        "family_id": membership.family_id if membership else None,
    }
    if invite_code is not None:
        payload["invite_code"] = invite_code
    return payload


class OAuthLoginView(APIView):
    """Принимает доверенный вызов от BFF. Не требует пользовательской аутентификации."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        provider = request.data.get("provider")
        provider_user_id = request.data.get("provider_user_id")

        if provider not in PROVIDER_FIELDS:
            return Response({"detail": "Неизвестный провайдер."}, status=400)
        if not provider_user_id:
            return Response({"detail": "provider_user_id обязателен."}, status=400)

        field = PROVIDER_FIELDS[provider]
        user = User.objects.filter(**{field: provider_user_id}).first()

        created = False
        if not user:
            base_username = f"{provider}_{provider_user_id}"
            username = base_username
            i = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{i}"
                i += 1

            user = User.objects.create(
                username=username,
                first_name=request.data.get("first_name", ""),
                last_name=request.data.get("last_name", ""),
                email=request.data.get("email", ""),
                role="",  # пустая роль → онбординг
                **{field: provider_user_id},
            )
            created = True

        payload = _user_payload(user)
        payload["created"] = created
        return Response(payload, status=201 if created else 200)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_user_payload(request.user))


class RegisterParentView(APIView):
    @transaction.atomic
    def post(self, request):
        user = request.user

        if user.role or user.family_memberships.exists():
            return Response(
                {"detail": "Онбординг уже завершён."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        family = FamilyGroup.objects.create(
            name=f"Семья {user.first_name or user.username}".strip()
        )
        FamilyMembership.objects.create(family=family, user=user, is_owner=True)
        user.role = User.Role.PARENT
        user.save(update_fields=["role"])

        # Сразу выдаём код приглашения, чтобы UI показал его на онбординге.
        invite = FamilyInviteCode.objects.create(family=family, created_by=user)
        return Response(
            _user_payload(user, invite_code=invite.code),
            status=status.HTTP_201_CREATED,
        )


class JoinByCodeView(APIView):
    @transaction.atomic
    def post(self, request):
        user = request.user

        # Роль, с которой пользователь вступает: CHILD (по умолчанию) или PARENT.
        role = request.data.get("role") or User.Role.CHILD
        if role not in (User.Role.CHILD, User.Role.PARENT):
            return Response(
                {"detail": "Недопустимая роль."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Второй родитель может вступить, даже если у него уже есть своя семья
        # (например, он по ошибке нажал «Создать семью»). Ребёнок — нет.
        if role == User.Role.CHILD and (user.role or user.family_memberships.exists()):
            return Response(
                {"detail": "Онбординг уже завершён."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FamilyJoinSerializer(
            data={"code": request.data.get("code")}, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        invite: FamilyInviteCode = serializer.validated_data["code"]

        # Не даём вступить в ту же семью повторно.
        if FamilyMembership.objects.filter(family=invite.family, user=user).exists():
            return Response(
                {"detail": "Вы уже состоите в этой семье."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        FamilyMembership.objects.create(family=invite.family, user=user, is_owner=False)
        invite.is_used = True
        invite.save(update_fields=["is_used"])
        user.role = role
        user.save(update_fields=["role"])
        return Response(_user_payload(user), status=status.HTTP_200_OK)
