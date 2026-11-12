# backend/motivation/views/tasks.py
import logging
from datetime import date, timedelta
from django.db.models import QuerySet, Prefetch
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from motivation.models import Task, TaskLog, WeeklyReport, User
from motivation.serializers import TaskSerializer, WeeklyReportSerializer
from motivation.services.weekly_reports import (
    build_weekly_review,
    build_week_forecast,
    build_report_drafts,
    close_week,
    week_bounds,
    week_start_of,
)
from .permissions import (
    ServiceOrUserPermission,
    OnboardedUserPermission,
    _is_bff,
    _is_authenticated,
)
from .family import _family_child_ids


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [ServiceOrUserPermission, OnboardedUserPermission]

    def get_queryset(self) -> QuerySet:
        request = self.request

        child_id_raw = request.query_params.get("child_id")
        child_id: int | None = None
        if child_id_raw:
            try:
                child_id = int(child_id_raw)
            except (TypeError, ValueError):
                child_id = None

        if _is_bff(request) or not _is_authenticated(request):
            queryset = Task.objects.all()
            if child_id is not None:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        user = request.user
        if not isinstance(user, User):
            return Task.objects.none()

        if user.is_child:
            return Task.objects.filter(child=user, is_active=True)

        if user.is_parent:
            child_ids = _family_child_ids(user)
            queryset = Task.objects.filter(child_id__in=child_ids)
            if child_id is not None:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        return Task.objects.none()

    @action(detail=False, methods=["get"], url_path="weekly-review")
    def weekly_review(self, request):
        child_id_raw = request.query_params.get("child_id")
        if not child_id_raw:
            return Response(
                {"detail": "Параметр child_id обязателен."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            child_id = int(child_id_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "child_id должен быть числом."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка доступа
        if not _is_bff(request) and _is_authenticated(request):
            user = request.user
            if isinstance(user, User):
                if user.is_parent:
                    allowed_ids = set(_family_child_ids(user))
                    if child_id not in allowed_ids:
                        return Response(
                            {"detail": "Ребёнок не найден в вашей семье."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                elif user.is_child and user.id != child_id:
                    return Response(
                        {"detail": "Нельзя смотреть чужие задания."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        week_start_str = request.query_params.get("week_start")
        if week_start_str:
            try:
                start_date = date.fromisoformat(week_start_str)
            except ValueError:
                return Response(
                    {"detail": "Неверный формат week_start. Используйте YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            start_date = week_start_of(date.today())

        end_date = start_date + timedelta(days=6)
        return Response(
            build_weekly_review(child_id, start_date, end_date),
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="my-weekly-report")
    def my_weekly_report(self, request):
        user = request.user
        if (
            not _is_authenticated(request)
            or not isinstance(user, User)
            or not user.is_child
        ):
            return Response(
                {"detail": "Доступно только ребёнку."},
                status=status.HTTP_403_FORBIDDEN,
            )

        current_start, _ = week_bounds(date.today())

        open_report = (
            WeeklyReport.objects.filter(
                child=user,
                start_date__lt=current_start,
            )
            .exclude(status=WeeklyReport.Status.CLOSED)
            .order_by("-start_date")
            .first()
        )
        previous_week = (
            build_week_forecast(user.id, open_report.start_date)
            if open_report
            else None
        )
        current_week = build_week_forecast(user.id, current_start)
        return Response(
            {"current": current_week, "previous": previous_week},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="close-week")
    def close_week_action(self, request):
        user = request.user
        if (
            not _is_authenticated(request)
            or not isinstance(user, User)
            or not user.is_parent
        ):
            return Response({"detail": "Доступно только родителю."}, status=403)

        child_id_raw = request.data.get("child_id")
        week_start_str = request.data.get("week_start")
        if not child_id_raw or not week_start_str:
            return Response(
                {"detail": "child_id и week_start обязательны."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            child_id = int(child_id_raw)
            week_start = date.fromisoformat(str(week_start_str))
        except (TypeError, ValueError):
            return Response(
                {
                    "detail": "child_id должен быть числом, week_start в формате YYYY-MM-DD."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = close_week(child_id, week_start, user, request.data)
        except DjangoValidationError as e:
            return Response(
                {"detail": e.messages[0] if e.messages else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(WeeklyReportSerializer(report).data, status=200)

    @action(detail=False, methods=["get"], url_path="reports-overview")
    def reports_overview(self, request):
        if not (_is_bff(request) or _is_authenticated(request)):
            return Response({"detail": "Нет доступа."}, status=403)

        child_id_param = request.query_params.get("child_id")
        week_start_param = request.query_params.get("week_start")

        if week_start_param:
            try:
                week_start = date.fromisoformat(week_start_param)
            except ValueError:
                return Response(
                    {"detail": "week_start в формате YYYY-MM-DD."},
                    status=400,
                )
        else:
            week_start = week_start_of(date.today())

        if child_id_param:
            try:
                child_ids = [int(child_id_param)]
            except (TypeError, ValueError):
                return Response({"detail": "child_id должен быть числом."}, status=400)
        elif _is_bff(request) or not _is_authenticated(request):
            child_ids = list(
                User.objects.filter(role=User.Role.CHILD).values_list("id", flat=True)
            )
        else:
            user = request.user
            if not isinstance(user, User):
                child_ids = []
            elif user.is_child:
                child_ids = [user.id]
            else:
                child_ids = list(_family_child_ids(user))

        return Response(build_report_drafts(child_ids, week_start), status=200)
