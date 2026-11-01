# backend/motivation/views.py
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.db.models import QuerySet, Prefetch
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from motivation.models import (
    User,
    FamilyMembership,
    FamilyInviteCode,
    Task,
    TaskLog,
    WeeklyReport,
    FamilyGroup,
    FamilyMembership,
    FamilyInviteCode,
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
    FamilyJoinSerializer,
)

PROVIDER_FIELDS = {
    "google": "google_id",
    "vk": "vk_id",
    "apple": "apple_id",
}


class OAuthLoginView(APIView):
    """Принимает доверенный вызов от BFF. Не требует пользовательской аутентификации."""

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


def _user_payload(user: User, invite_code: str | None = None) -> dict:
    membership = user.family_memberships.select_related("family").first()
    payload = {
        "id": user.id,
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


class MeView(APIView):
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

            week_closed = WeeklyReport.objects.filter(
                child_id=child_id,
                start_date=start_date,
                status=WeeklyReport.Status.CLOSED,
            ).exists()

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
                    "weekClosed": week_closed,
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

    @action(detail=False, methods=["get"], url_path="my-weekly-report")
    def my_weekly_report(self, request):
        if not _is_authenticated(request) or not getattr(
            request.user, "is_child", False
        ):
            return Response(
                {"detail": "Доступно только ребёнку."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from motivation.services.weekly_reports import week_bounds, build_week_forecast

        today = date.today()
        current_start, _ = week_bounds(today)

        # последняя незакрытая неделя до текущей
        open_report = (
            WeeklyReport.objects.filter(
                child=request.user,
                start_date__lt=current_start,
            )
            .exclude(status=WeeklyReport.Status.CLOSED)
            .order_by("-start_date")
            .first()
        )
        previous_week = None
        if open_report:
            previous_week = build_week_forecast(request.user.id, open_report.start_date)

        current_week = build_week_forecast(request.user.id, current_start)
        return Response(
            {"current": current_week, "previous": previous_week},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="close-week")
    def close_week_action(self, request):
        if not _is_authenticated(request) or not getattr(
            request.user, "is_parent", False
        ):
            return Response({"detail": "Доступно только родителю."}, status=403)

        child_id = request.data.get("child_id")
        week_start = request.data.get("week_start")
        if not child_id or not week_start:
            return Response(
                {"detail": "child_id и week_start обязательны."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from motivation.services.weekly_reports import close_week

        try:
            report = close_week(
                child_id, date.fromisoformat(week_start), request.user, request.data
            )
        except ValueError:
            return Response({"detail": "week_start в формате YYYY-MM-DD."}, status=400)
        except DjangoValidationError as e:
            return Response(
                {"detail": e.messages[0] if e.messages else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(WeeklyReportSerializer(report).data, status=200)

    @action(detail=False, methods=["get"], url_path="reports-overview")
    def reports_overview(self, request):
        """Список отчётов по всем детям семьи (или одного ребёнка)."""
        from motivation.services.weekly_reports import (
            build_report_drafts,
            week_start_of,
        )

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
            child_ids = [int(child_id_param)]
        else:
            if _is_bff(request) or not _is_authenticated(request):
                from motivation.models import User

                child_ids = list(
                    User.objects.filter(role=User.Role.CHILD).values_list(
                        "id", flat=True
                    )
                )
            else:
                user = request.user
                if getattr(user, "is_child", False):
                    child_ids = [user.id]
                else:
                    child_ids = list(_family_child_ids(user))

        return Response(build_report_drafts(child_ids, week_start), status=200)


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
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from motivation.services.task_logs import assert_week_open

        task = serializer.validated_data["task"]
        log_date = serializer.validated_data["date"]
        user = self.request.user

        if _is_authenticated(self.request):
            if getattr(user, "is_child", False) and task.child != user:
                raise permissions.PermissionDenied("Нельзя отмечать чужие задания.")

        try:
            assert_week_open(task, log_date)
        except DjangoValidationError as e:
            raise DRFValidationError({"detail": e.messages[0]})

        initial_status = serializer.validated_data.get("status", TaskLog.Status.PENDING)
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

        qs = TaskLog.objects.filter(id__in=log_ids, status=TaskLog.Status.DONE_BY_CHILD)
        if _is_authenticated(request) and getattr(request.user, "is_parent", False):
            child_ids = _family_child_ids(request.user)
            qs = qs.filter(task__child_id__in=child_ids)

        logs = list(qs)
        approved_ids = []
        skipped_closed = []

        for log in logs:
            try:
                change_task_log_status(log.id, TaskLog.Status.APPROVED, request.user)
                approved_ids.append(log.id)
            except DjangoValidationError:
                skipped_closed.append(log.id)

        return Response(
            {
                "detail": f"Успешно подтверждено логов: {len(approved_ids)}.",
                "approved_ids": approved_ids,
                "skipped_closed": skipped_closed,
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
