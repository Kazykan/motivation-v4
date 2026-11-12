from django.db.models import QuerySet
from rest_framework import viewsets

from motivation.models import User
from motivation.serializers import UserSerializer
from .permissions import ServiceOrUserPermission, _is_bff, _is_authenticated
from .family import _family_child_ids


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [ServiceOrUserPermission]
    serializer_class = UserSerializer

    def get_queryset(self) -> QuerySet:
        request = self.request
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
            return queryset.filter(id=user.id)

        if getattr(user, "role", None) == User.Role.PARENT:
            child_ids = _family_child_ids(user)
            return queryset.filter(id__in=child_ids)

        return queryset.none()
