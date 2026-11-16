# backend/motivation/views/task_logs.py
import logging
from decimal import Decimal
from typing import cast

from django.db.models import QuerySet
from django.core.exceptions import (
    PermissionDenied,
    ValidationError as DjangoValidationError,
)
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response

from motivation.models import TaskLog, FamilyMembership
from motivation.serializers import TaskLogSerializer, TaskLogHistorySerializer
from motivation.services.task_logs import (
    assert_not_future,
    change_task_log_status,
    assert_week_open,
)
from .permissions import ServiceOrUserPermission, _is_bff, _is_authenticated
from .family import _family_child_ids


class TaskLogViewSet(viewsets.ModelViewSet):
    queryset = TaskLog.objects.all()
    serializer_class = TaskLogSerializer
    permission_classes = [ServiceOrUserPermission]

    def get_queryset(self):
        request = self.request

        if _is_bff(request) or not _is_authenticated(request):
            return TaskLog.objects.all()

        user = request.user

        if getattr(user, "is_parent", False):
            child_ids = _family_child_ids(user)
            return TaskLog.objects.filter(task__child_id__in=child_ids)

        if getattr(user, "is_child", False):
            return TaskLog.objects.filter(task__child=user)

        return TaskLog.objects.none()

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        task_log = self.get_object()
        history_records = task_log.history.all()
        serializer = TaskLogHistorySerializer(history_records, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        request = cast(DRFRequest, self.request)
        task = serializer.validated_data["task"]
        log_date = serializer.validated_data["date"]

        if log_date is None:
            raise DRFValidationError({"date": "Поле date обязательно."})
        user = self.request.user

        # Авторизация по роли:
        if _is_authenticated(self.request):
            if getattr(user, "is_child", False):
                if task.child != user:
                    raise PermissionDenied("Нельзя отмечать чужие задания.")
            elif getattr(user, "is_parent", False):
                if not FamilyMembership.objects.filter(
                    user=user, family__memberships__user=task.child
                ).exists():
                    raise PermissionDenied("Ребёнок не из вашей семьи.")
            else:
                raise PermissionDenied("Роль не задана.")

        try:
            assert_not_future(log_date)
            assert_week_open(task, log_date)
        except DjangoValidationError as e:
            raise DRFValidationError({"detail": e.messages[0]})

        initial_status = request.data.get("status", TaskLog.Status.PENDING)
        serializer.validated_data["status"] = TaskLog.Status.PENDING
        log = serializer.save(earned_amount=Decimal("0.00"))

        if initial_status != TaskLog.Status.PENDING:
            change_task_log_status(log.id, initial_status, user)

    def perform_update(self, serializer):

        logger = logging.getLogger("motivation.auth")
        logger.debug(
            "PATCH task-log id=%s raw_status=%r current=%r payload=%r",
            serializer.instance.id,
            self.request.data.get("status"),
            serializer.instance.status,
            serializer.validated_data,
        )

        user = self.request.user
        instance = serializer.instance

        # status объявлен read_only в TaskLogSerializer,
        # поэтому берём его из сырого тела запроса.
        new_status = self.request.data.get("status")

        if new_status and new_status != instance.status:
            change_task_log_status(instance.id, new_status, user)
            instance.refresh_from_db()

        if serializer.validated_data:
            serializer.save()

    @action(detail=False, methods=["post"], url_path="bulk-approve")
    def bulk_approve(self, request):
        if _is_authenticated(request):
            if not getattr(request.user, "is_parent", False):
                return Response(
                    {"detail": "Только родитель может массово подтверждать задания."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        log_ids = request.data.get("log_ids", [])
        if not isinstance(log_ids, list) or not log_ids:
            return Response(
                {"detail": "Необходимо передать список ID логов (log_ids)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = TaskLog.objects.filter(id__in=log_ids, status=TaskLog.Status.DONE_BY_CHILD)
        if _is_authenticated(request) and getattr(request.user, "is_parent", False):
            child_ids = _family_child_ids(request.user)
            qs = qs.filter(task__child_id__in=child_ids)

        logs = list(qs)
        approved_ids = []
        skipped_closed = []

        for log in logs:
            try:
                change_task_log_status(log.pk, TaskLog.Status.APPROVED, request.user)
                approved_ids.append(log.pk)
            except DjangoValidationError:
                skipped_closed.append(log.pk)

        return Response(
            {
                "detail": f"Успешно подтверждено логов: {len(approved_ids)}.",
                "approved_ids": approved_ids,
                "skipped_closed": skipped_closed,
            },
            status=status.HTTP_200_OK,
        )
