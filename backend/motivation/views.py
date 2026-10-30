# backend/motivation/views.py
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import QuerySet, Prefetch
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from motivation.models import (
    User,
    FamilyMembership,
    FamilyInviteCode,
    Task,
    TaskLog,
    WeeklyReport,
)
from motivation.services.task_logs import change_task_log_status
from .serializers import (
    UserSerializer,
    FamilyInviteCodeCreateSerializer,
    FamilyJoinSerializer,
    TaskSerializer,
    TaskLogSerializer,
    WeeklyReportSerializer,
    TaskLogHistorySerializer,
)


class ServiceOrUserPermission(permissions.BasePermission):
    """
    Разрешает запрос, если:
    - успешно прошла TelegramInitDataAuthentication (request.user — юзер);
    - либо успешно прошла BFFServiceAuthentication (request.auth == 'bff-service').
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            return True
        if getattr(request, "auth", None) == "bff-service":
            return True
        return False


def _is_bff(request) -> bool:
    return getattr(request, "auth", None) == "bff-service"


def _is_authenticated(request) -> bool:
    user = getattr(request, "user", None)
    return bool(user and getattr(user, "is_authenticated", False))


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


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [ServiceOrUserPermission]
    serializer_class = UserSerializer

    def get_queryset(self) -> QuerySet:
        request = self.request
        queryset = User.objects.all()

        # BFF-сервис — доверенный, отдаём всех (фильтр по query_param is_child).
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


class FamilyInviteCodeViewSet(viewsets.ModelViewSet):
    queryset = FamilyInviteCode.objects.all()
    permission_classes = [ServiceOrUserPermission]

    def get_serializer_class(self):
        return FamilyInviteCodeCreateSerializer

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


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [ServiceOrUserPermission]

    def get_queryset(self):
        request = self.request

        if _is_bff(request) or not _is_authenticated(request):
            queryset = Task.objects.all()
            child_id = request.query_params.get("child_id")
            if child_id:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        user = request.user

        if getattr(user, "is_child", False):
            return Task.objects.filter(child=user, is_active=True)

        if getattr(user, "is_parent", False):
            child_ids = _family_child_ids(user)
            queryset = Task.objects.filter(child_id__in=child_ids)
            child_id = request.query_params.get("child_id")
            if child_id:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        return Task.objects.none()

    @action(detail=False, methods=["get"], url_path="weekly-review")
    def weekly_review(self, request):
        child_id = request.query_params.get("child_id")
        if not child_id:
            return Response(
                {"detail": "Параметр child_id обязателен."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка доступа: родитель может смотреть только детей своей семьи.
        if not _is_bff(request) and _is_authenticated(request):
            user = request.user
            if getattr(user, "is_parent", False):
                allowed_ids = set(_family_child_ids(user))
                try:
                    child_id_int = int(child_id)
                except (TypeError, ValueError):
                    return Response(
                        {"detail": "child_id должен быть числом."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if child_id_int not in allowed_ids:
                    return Response(
                        {"detail": "Ребёнок не найден в вашей семье."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            elif getattr(user, "is_child", False) and str(user.id) != str(child_id):
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
            today = date.today()
            start_date = today - timedelta(days=today.weekday())

        end_date = start_date + timedelta(days=6)

        tasks = (
            Task.objects.filter(child_id=child_id, is_active=True)
            .select_related("child")
            .order_by("title", "id")
            .prefetch_related(
                Prefetch(
                    "logs",
                    queryset=TaskLog.objects.filter(
                        date__range=[start_date, end_date]
                    ).order_by("date", "id"),
                    to_attr="filtered_logs",
                )
            )
        )

        result = []
        for task in tasks:
            logs_data = []
            approved_count = 0
            pending_count = 0
            rejected_count = 0
            calculated_amount = 0.0

            for log in task.filtered_logs:
                if log.status == TaskLog.Status.APPROVED:
                    approved_count += 1
                    calculated_amount += float(log.earned_amount)
                elif log.status == TaskLog.Status.DONE_BY_CHILD:
                    pending_count += 1
                elif log.status == TaskLog.Status.REJECTED:
                    rejected_count += 1

                logs_data.append(
                    {
                        "id": log.id,
                        "date": log.date.isoformat(),
                        "status": log.status,
                        "earned_amount": str(log.earned_amount),
                    }
                )

            child_obj = task.child
            child_name = (
                (child_obj.first_name or child_obj.username) if child_obj else "Ребенок"
            )

            child_age = None
            if child_obj and getattr(child_obj, "birth_date", None):
                today = date.today()
                child_age = (
                    today.year
                    - child_obj.birth_date.year
                    - (
                        (today.month, today.day)
                        < (child_obj.birth_date.month, child_obj.birth_date.day)
                    )
                )

            result.append(
                {
                    "taskId": task.id,
                    "title": task.title,
                    "description": task.description,
                    "weeklyPrice": str(task.weekly_price),
                    "scheduleType": task.schedule_type,
                    "targetCount": task.target_count,
                    "targetDays": task.target_days,
                    "weekStart": start_date.isoformat(),
                    "weekEnd": end_date.isoformat(),
                    "child": {
                        "id": child_obj.id if child_obj else None,
                        "name": child_name,
                        "age": child_age,
                        "avatar": getattr(child_obj, "avatar_url", "") or "",
                    },
                    "summary": {
                        "approvedCount": approved_count,
                        "pendingCount": pending_count,
                        "rejectedCount": rejected_count,
                        "calculatedAmount": str(round(calculated_amount, 2)),
                    },
                    "logs": logs_data,
                }
            )

        return Response(result, status=status.HTTP_200_OK)


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
        task = serializer.validated_data["task"]
        user = self.request.user

        if _is_authenticated(self.request):
            if getattr(user, "is_child", False) and task.child != user:
                raise permissions.PermissionDenied("Нельзя отмечать чужие задания.")

        initial_status = serializer.validated_data.get("status", TaskLog.Status.PENDING)

        # Сохраняем как PENDING, чтобы change_task_log_status зафиксировал переход в истории
        serializer.validated_data["status"] = TaskLog.Status.PENDING
        log = serializer.save(earned_amount=Decimal("0.00"))

        if initial_status != TaskLog.Status.PENDING:
            change_task_log_status(log.id, initial_status, user)

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance
        new_status = serializer.validated_data.get("status")

        if new_status and new_status != instance.status:
            change_task_log_status(instance.id, new_status, user)

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

        # Родитель может подтверждать только логи детей своей семьи.
        qs = TaskLog.objects.filter(id__in=log_ids, status=TaskLog.Status.DONE_BY_CHILD)
        if _is_authenticated(request) and getattr(request.user, "is_parent", False):
            child_ids = _family_child_ids(request.user)
            qs = qs.filter(task__child_id__in=child_ids)

        logs = list(qs)
        updated_count = 0
        for log in logs:
            change_task_log_status(log.id, TaskLog.Status.APPROVED, request.user)
            updated_count += 1

        return Response(
            {
                "detail": f"Успешно подтверждено логов: {updated_count}.",
                "approved_ids": [log.id for log in logs],
            },
            status=status.HTTP_200_OK,
        )


class WeeklyReportViewSet(viewsets.ModelViewSet):
    queryset = WeeklyReport.objects.all()
    serializer_class = WeeklyReportSerializer
    permission_classes = [ServiceOrUserPermission]

    def get_queryset(self) -> QuerySet:
        request = self.request

        if _is_bff(request) or not _is_authenticated(request):
            queryset = WeeklyReport.objects.all()
            child_id = request.query_params.get("child_id")
            if child_id:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        user = request.user

        if getattr(user, "is_child", False):
            return WeeklyReport.objects.filter(child=user)

        if getattr(user, "is_parent", False):
            child_ids = _family_child_ids(user)
            queryset = WeeklyReport.objects.filter(child_id__in=child_ids)
            child_id = request.query_params.get("child_id")
            if child_id:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        return WeeklyReport.objects.none()
