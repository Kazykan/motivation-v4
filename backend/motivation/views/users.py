from typing import Any, cast
from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.request import Request as DRFRequest

from motivation.models import User, FamilyMembership
from rest_framework.response import Response
from motivation.serializers import UserSerializer
from rest_framework.decorators import action
from .permissions import ServiceOrUserPermission, _is_bff, _is_authenticated
from .family import _family_child_ids


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [ServiceOrUserPermission]
    serializer_class = UserSerializer

    def get_queryset(self) -> Any:
        request = cast(DRFRequest, self.request)
        queryset = User.objects.all()

        if _is_bff(request) or not _is_authenticated(request):
            is_child_param = request.query_params.get("is_child")
            if is_child_param is not None:
                is_child = is_child_param.lower() in ("true", "1")
                role_val = User.Role.CHILD if is_child else User.Role.PARENT
                queryset = queryset.filter(role=role_val)
            return queryset

        user = request.user

        if getattr(user, "role", None) == User.Role.CHILD:
            return queryset.filter(id=user.pk)

        if getattr(user, "role", None) == User.Role.PARENT:
            child_ids = _family_child_ids(user)
            return queryset.filter(id__in=child_ids)

        return queryset.none()

    @action(detail=False, methods=["get"], url_path="family-members")
    def family_members(self, request):
        request = cast(DRFRequest, request)
        if not _is_authenticated(request):
            return Response({"detail": "Требуется аутентификация."}, status=403)

        user = request.user
        family_ids = FamilyMembership.objects.filter(user=user).values_list(
            "family_id", flat=True
        )
        user_ids = FamilyMembership.objects.filter(
            family_id__in=family_ids
        ).values_list("user_id", flat=True)

        members = User.objects.filter(id__in=user_ids).distinct()
        return Response(UserSerializer(members, many=True).data)
