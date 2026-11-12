from typing import cast
from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from motivation.models import WeeklyReport, User
from motivation.serializers import WeeklyReportSerializer
from .permissions import ServiceOrUserPermission, _is_authenticated, _is_bff
from .family import _family_child_ids


class WeeklyReportViewSet(viewsets.ModelViewSet):
    queryset = WeeklyReport.objects.all()
    serializer_class = WeeklyReportSerializer
    permission_classes = [ServiceOrUserPermission]

    def _child_id_param(self) -> int | None:
        """Возвращает child_id из query params как int или None."""
        raw = self.request.query_params.get("child_id")
        if raw is None or raw == "":
            return None
        try:
            return int(raw)
        except (TypeError, ValueError):
            raise ValidationError({"child_id": "Должно быть целым числом."})

    def get_queryset(self) -> QuerySet:
        request = self.request
        child_id = self._child_id_param()

        if _is_bff(request) or not _is_authenticated(request):
            queryset = WeeklyReport.objects.all()
            if child_id is not None:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        user = request.user

        if isinstance(user, User):
            if user.is_child:
                return WeeklyReport.objects.filter(child=user)

            if user.is_parent:
                child_ids = _family_child_ids(user)
                queryset = WeeklyReport.objects.filter(child_id__in=child_ids)
                if child_id is not None:
                    queryset = queryset.filter(child_id=child_id)
                return queryset

        return WeeklyReport.objects.none()
