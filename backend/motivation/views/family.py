# backend/motivation/views/family.py
from django.db.models import QuerySet
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from motivation.models import User, FamilyMembership, FamilyInviteCode
from motivation.serializers import (
    FamilyInviteCodeCreateSerializer,
    FamilyJoinSerializer,
)
from .permissions import ServiceOrUserPermission, _is_authenticated


def _family_child_ids(user) -> QuerySet:
    """
    Возвращает QuerySet id детей, состоящих в тех же семьях, что и `user`.

    Используется для фильтрации всех родительских выборок,
    чтобы родитель не видел задачи/логи/отчёты чужих семей.
    """
    family_ids = FamilyMembership.objects.filter(user=user).values_list(
        "family_id", flat=True
    )
    return FamilyMembership.objects.filter(
        family_id__in=family_ids,
        user__role=User.Role.CHILD,
    ).values_list("user_id", flat=True)


class FamilyInviteCodeViewSet(viewsets.ModelViewSet):
    queryset = FamilyInviteCode.objects.all()
    permission_classes = [ServiceOrUserPermission]

    def get_serializer_class(self):
        return FamilyInviteCodeCreateSerializer

    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        """Возвращает действующий код родителя (создаёт, если его нет)."""
        if not _is_authenticated(request) or not getattr(
            request.user, "is_parent", False
        ):
            return Response(
                {"detail": "Только родитель может управлять кодами."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = request.user
        membership = user.family_memberships.first()
        if not membership:
            return Response(
                {"detail": "Вы не состоите ни в одной семье."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invite = (
            FamilyInviteCode.objects.filter(
                family=membership.family,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
            .order_by("-id")
            .first()
        )

        if not invite:
            invite = FamilyInviteCode.objects.create(
                family=membership.family,
                created_by=user,
            )

        return Response(FamilyInviteCodeCreateSerializer(invite).data)

    @action(detail=False, methods=["post"], url_path="join")
    def join_family(self, request):
        serializer = FamilyJoinSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        family = serializer.save()
        return Response(
            {"detail": f"Вы успешно присоединились к семье '{family.name}'."},
            status=status.HTTP_200_OK,
        )
