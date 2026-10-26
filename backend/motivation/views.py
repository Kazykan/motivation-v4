from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import (
    FamilyGroup,
    FamilyMembership,
    FamilyInviteCode,
    Task,
    TaskLog,
    WeeklyReport,
)
from django.db.models import QuerySet
from django.conf import settings
from .serializers import (
    UserSerializer,
    FamilyInviteCodeCreateSerializer,
    FamilyJoinSerializer,
    TaskSerializer,
    TaskLogSerializer,
    WeeklyReportSerializer,
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
                # Фильтрация по реальному полю роли в БД
                role_val = User.Role.CHILD if hasattr(User, "Role") else "CHILD"
                if not is_child:
                    role_val = "PARENT"
                queryset = queryset.filter(role=role_val)
            return queryset

        # Проверка через атрибут роли вместо property
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
        queryset = TaskLog.objects.all()

        if getattr(settings, "DISABLE_AUTH", False) or not user.is_authenticated:
            child_id = self.request.query_params.get("child_id")
            if child_id:
                queryset = queryset.filter(task__child_id=child_id)
            date_val = self.request.query_params.get("date")
            if date_val:
                queryset = queryset.filter(date=date_val)
            return queryset

        if getattr(user, "is_child", False):
            queryset = queryset.filter(task__child=user)

        child_id = self.request.query_params.get("child_id")
        if child_id and getattr(user, "is_parent", False):
            queryset = queryset.filter(task__child_id=child_id)

        date_val = self.request.query_params.get("date")
        if date_val:
            queryset = queryset.filter(date=date_val)
        return queryset

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
        updated_by_parent = (
            True
            if (user.is_authenticated and getattr(user, "is_parent", False))
            else False
        )
        serializer.save(earned_amount=earned, updated_by_parent=updated_by_parent)

    @action(detail=False, methods=["post"], url_path="bulk-approve")
    def bulk_approve(self, request):
        if not getattr(settings, "DISABLE_AUTH", False):
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
            log.status = TaskLog.Status.APPROVED
            if log.task:
                log.earned_amount = log.task.price_per_run
            log.updated_by_parent = True
            log.save()
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
