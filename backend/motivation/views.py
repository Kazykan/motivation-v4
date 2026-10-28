# backend/motivation/views.py
from datetime import date, timedelta

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from motivation.services.task_logs import change_task_log_status
from .models import (
    FamilyGroup,
    FamilyMembership,
    FamilyInviteCode,
    Task,
    TaskLog,
    WeeklyReport,
)
from django.db.models import Prefetch, QuerySet
from django.conf import settings
from .serializers import (
    UserSerializer,
    FamilyInviteCodeCreateSerializer,
    FamilyJoinSerializer,
    TaskSerializer,
    TaskLogSerializer,
    WeeklyReportSerializer,
    TaskLogHistorySerializer,
)

User = get_user_model()


class IsParentOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if getattr(settings, "DISABLE_AUTH", False):
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "is_parent", False)
        )


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer

    def get_queryset(self) -> QuerySet:
        user = self.request.user
        queryset = User.objects.all()

        if getattr(settings, "DISABLE_AUTH", False) or not user.is_authenticated:
            is_child_param = self.request.query_params.get("is_child")
            if is_child_param is not None:
                is_child = is_child_param.lower() in ["true", "1"]
                role_val = User.Role.CHILD if hasattr(User, "Role") else "CHILD"
                if not is_child:
                    role_val = "PARENT"
                queryset = queryset.filter(role=role_val)
            return queryset

        if getattr(user, "role", None) == "CHILD":
            return queryset.filter(id=user.id)

        if getattr(user, "role", None) == "PARENT":
            family_ids = FamilyMembership.objects.filter(
                user=user, role="PARENT"
            ).values_list("family_id", flat=True)

            child_ids = FamilyMembership.objects.filter(
                family_id__in=family_ids, role="CHILD"
            ).values_list("user_id", flat=True)

            return queryset.filter(id__in=child_ids)

        return queryset.none()


class FamilyInviteCodeViewSet(viewsets.ModelViewSet):
    queryset = FamilyInviteCode.objects.all()
    permission_classes = [
        (
            permissions.AllowAny
            if getattr(settings, "DISABLE_AUTH", False)
            else permissions.IsAuthenticated
        )
    ]

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
    permission_classes = [
        (
            permissions.AllowAny
            if getattr(settings, "DISABLE_AUTH", False)
            else permissions.IsAuthenticated
        ),
        IsParentOrReadOnly,
    ]

    def get_queryset(self):
        user = self.request.user
        if getattr(settings, "DISABLE_AUTH", False) or not user.is_authenticated:
            queryset = Task.objects.all()
            child_id = self.request.query_params.get("child_id")
            if child_id:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        if getattr(user, "is_child", False):
            return Task.objects.filter(child=user, is_active=True)

        queryset = Task.objects.all()
        child_id = self.request.query_params.get("child_id")
        if child_id:
            queryset = queryset.filter(child_id=child_id)
        return queryset

    @action(detail=False, methods=["get"], url_path="weekly-review")
    def weekly_review(self, request):
        child_id = request.query_params.get("child_id")
        if not child_id:
            return Response(
                {"detail": "Параметр child_id обязателен."},
                status=status.HTTP_400_BAD_REQUEST,
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
            .prefetch_related(
                Prefetch(
                    "logs",
                    queryset=TaskLog.objects.filter(date__range=[start_date, end_date]),
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
            calculated_amount = 0

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
                child_obj.first_name or child_obj.username if child_obj else "Ребенок"
            )

            child_age = 12
            if getattr(child_obj, "birth_date", None):
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
    permission_classes = [
        (
            permissions.AllowAny
            if getattr(settings, "DISABLE_AUTH", False)
            else permissions.IsAuthenticated
        )
    ]

    def get_queryset(self):
        user = self.request.user

        if getattr(settings, "DISABLE_AUTH", False) or not user.is_authenticated:
            return TaskLog.objects.all()

        if getattr(user, "is_parent", False):
            return TaskLog.objects.all()

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

        if not getattr(settings, "DISABLE_AUTH", False) and user.is_authenticated:
            if getattr(user, "is_child", False) and task.child != user:
                raise permissions.PermissionDenied("Нельзя отмечать чужие задания.")

        earned = (
            task.price_per_run
            if serializer.validated_data.get("status") in ["DONE", "APPROVED"]
            else 0
        )
        log = serializer.save(earned_amount=earned)

        initial_status = serializer.validated_data.get("status")
        if initial_status and initial_status != TaskLog.Status.PENDING:
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
        disable_auth = getattr(settings, "DISABLE_AUTH", False)

        if not disable_auth:
            if not request.user.is_authenticated or not getattr(
                request.user, "is_parent", False
            ):
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

        logs = TaskLog.objects.filter(
            id__in=log_ids, status=TaskLog.Status.DONE_BY_CHILD
        )

        updated_count = 0
        for log in logs:
            change_task_log_status(log.id, TaskLog.Status.APPROVED, request.user)
            updated_count += 1

        return Response(
            {
                "detail": f"Успешно подтверждено логов: {updated_count}.",
                "approved_ids": list(logs.values_list("id", flat=True)),
            },
            status=status.HTTP_200_OK,
        )


class WeeklyReportViewSet(viewsets.ModelViewSet):
    queryset = WeeklyReport.objects.all()
    serializer_class = WeeklyReportSerializer
    permission_classes = [
        (
            permissions.AllowAny
            if getattr(settings, "DISABLE_AUTH", False)
            else permissions.IsAuthenticated
        )
    ]

    def get_queryset(self) -> QuerySet:
        user = self.request.user
        if getattr(settings, "DISABLE_AUTH", False) or not user.is_authenticated:
            queryset = WeeklyReport.objects.all()
            child_id = self.request.query_params.get("child_id")
            if child_id:
                queryset = queryset.filter(child_id=child_id)
            return queryset

        if getattr(user, "is_child", False):
            return WeeklyReport.objects.filter(child=user)

        queryset = WeeklyReport.objects.all()
        child_id = self.request.query_params.get("child_id")
        if child_id:
            queryset = queryset.filter(child_id=child_id)
        return queryset
