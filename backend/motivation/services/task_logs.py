# backend/motivation/services/task_logs.py
from decimal import Decimal

from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import PermissionDenied, ValidationError

from motivation.models import TaskLog, TaskLogHistory, User, WeeklyReport


def _week_start(d):
    return d - timezone.timedelta(days=d.weekday())


def _parents_of_child(child: User):
    """Все родители, состоящие в тех же семьях, что и ребёнок."""
    family_ids = FamilyMembership.objects.filter(user=child).values_list(
        "family_id", flat=True
    )
    return User.objects.filter(
        role=User.Role.PARENT,
        family_memberships__family_id__in=family_ids,
    ).distinct()


def _notify_parents_about_submission(log: TaskLog) -> None:
    """Push родителям, когда ребёнок отметил задание (DONE_BY_CHILD).

    Не бросает исключений: push не должен ломать основной флоу.
    """
    child = log.task.child
    child_name = child.first_name or child.username or "Ребёнок"
    title = "Задание на проверку"
    body = f"{child_name} отметил «{log.task.title}»."

    for parent in _parents_of_child(child):
        try:
            send_push_to_user(parent, title, body, url="/parent/review")
        except Exception:
            logger.exception("push to parent %s failed", parent.id)


def _check_status_change_permission(log: TaskLog, new_status: str, user) -> None:
    """Проверяет права пользователя на смену статуса лога."""
    if not (user and user.is_authenticated):
        return

    is_child = getattr(user, "role", None) == User.Role.CHILD
    is_parent = getattr(user, "role", None) == User.Role.PARENT

    if is_child and log.task.child.pk != user.id:
        raise PermissionDenied("Ребёнок не может изменять чужие задания.")
    if is_child and new_status in (
        TaskLog.Status.APPROVED,
        TaskLog.Status.REJECTED,
    ):
        raise PermissionDenied("Ребёнок не может подтверждать/отклонять.")
    if not is_child and not is_parent:
        raise PermissionDenied("Роль не задана.")


def _apply_status_change(log: TaskLog, new_status: str, user) -> None:
    """Записывает историю, обновляет поля лога, пересчитывает earnings."""
    from django.contrib.auth.models import (
        AnonymousUser,
    )  # локально, чтобы не тянуть в модуль

    old_status = log.status

    is_anon = isinstance(user, AnonymousUser) or not user or not user.is_authenticated
    changed_by_user = None if is_anon else user
    is_parent_user = True if is_anon else getattr(user, "role", None) == "PARENT"

    TaskLogHistory.objects.create(
        log=log,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by_user,
    )

    log.status = new_status
    log.updated_by = changed_by_user
    log.updated_by_parent = is_parent_user

    update_fields = ["status", "updated_by", "updated_by_parent", "updated_at"]

    if new_status in (TaskLog.Status.CANCELLED, TaskLog.Status.REJECTED):
        log.earned_amount = Decimal("0.00")
        update_fields.append("earned_amount")

    log.save(update_fields=update_fields)

    # Пересчёт копеек для недели этого лога (для FLEXIBLE и FIXED).
    if log.task.pk:
        start_date = log.date - timezone.timedelta(days=log.date.weekday())
        end_date = start_date + timezone.timedelta(days=6)
        recalculate_task_logs_earnings(log.task, start_date, end_date)


def is_week_closed(task, log_date) -> bool:
    """True, если за неделю, содержащую log_date, для ребёнка есть закрытый отчёт."""
    start = _week_start(log_date)
    return WeeklyReport.objects.filter(
        child_id=task.child_id,
        start_date=start,
        status=WeeklyReport.Status.CLOSED,
    ).exists()


def assert_week_open(task, log_date):
    """Бросает ValidationError, если неделя закрыта."""

    if is_week_closed(task, log_date):
        raise ValidationError(
            "Неделя закрыта. Изменять выполнения за закрытую неделю нельзя."
        )


def recalculate_task_logs_earnings(task, week_start, week_end):
    """
    Пересчитывает earned_amount для логов конкретного задания за неделю
    в строгом хронологическом порядке с распределением остатка копеек.

    Вызывается из change_task_log_status после изменения статуса лога.
    Не вызывается из TaskLog.save() — это исключает рекурсию.
    """
    logs = list(
        task.logs.filter(
            date__range=[week_start, week_end],
            status__in=[TaskLog.Status.APPROVED, TaskLog.Status.DONE_BY_CHILD],
        ).order_by("date", "id")
    )

    if task.schedule_type == task.ScheduleType.FLEXIBLE:
        runs = task.target_count or 1
    else:
        runs = len(task.target_days or [])

    if runs <= 0:
        return

    total_cents = int(task.weekly_price * 100)
    base_cents, remainder = divmod(total_cents, runs)

    to_update = []
    for index, log in enumerate(logs):
        if index < runs:
            cents = base_cents + (1 if index < remainder else 0)
            new_earned = Decimal(cents) / Decimal("100")
        else:
            new_earned = Decimal("0.00")

        if log.earned_amount != new_earned:
            log.earned_amount = new_earned
            to_update.append(log)

    if to_update:
        TaskLog.objects.bulk_update(to_update, ["earned_amount"])


def assert_not_future(log_date):
    if log_date > timezone.localdate():
        raise ValidationError("Нельзя отмечать будущие дни.")


@transaction.atomic
def change_task_log_status(log_id, new_status, user):
    """
    Безопасно изменяет статус выполнения задания.

    Пересчёт earned_amount за неделю выполняется здесь,
    ровно один раз на изменение статуса.
    """
    log = TaskLog.objects.select_for_update().get(id=log_id)

    _check_status_change_permission(log, new_status, user)

    if new_status not in TaskLog.Status.values:
        raise ValueError("Недопустимый статус выполнения.")

    if log.status == new_status:
        return log

    assert_not_future(log.date)
    assert_week_open(log.task, log.date)

    old_status = log.status

    _apply_status_change(log, new_status, user)

    # Push родителям: только при переходе в DONE_BY_CHILD.
    if (
        old_status != TaskLog.Status.DONE_BY_CHILD
        and new_status == TaskLog.Status.DONE_BY_CHILD
    ):
        _notify_parents_about_submission(log)

    return log
