# backend/motivation/services/task_logs.py
from datetime import timedelta
from decimal import Decimal
import logging

from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import PermissionDenied, ValidationError

from motivation.models import (
    FamilyMembership,
    TaskLog,
    TaskLogHistory,
    User,
    WeeklyReport,
)
from motivation.services.push import send_push_to_user

logger = logging.getLogger(__name__)


def _week_start(d):
    return d - timedelta(days=d.weekday())


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

    parents = list(_parents_of_child(child))
    logger.info(
        "Notifying %d parent(s) about submission log_id=%s task_id=%s child_id=%s",
        len(parents),
        log.pk,
        log.task.id,
        child.pk,
    )

    for parent in parents:
        try:
            send_push_to_user(parent, title, body, url="/parent/review")
        except Exception:
            logger.exception(
                "Push to parent %s failed for log_id=%s", parent.pk, log.pk
            )


def _check_status_change_permission(log: TaskLog, new_status: str, user) -> None:
    """Проверяет права пользователя на смену статуса лога."""
    if not (user and user.is_authenticated):
        logger.debug("Permission check skipped for anonymous user, log_id=%s", log.pk)
        return

    is_child = getattr(user, "role", None) == User.Role.CHILD
    is_parent = getattr(user, "role", None) == User.Role.PARENT

    if is_child and log.task.child.pk != user.id:
        logger.warning(
            "Child user_id=%s attempted to modify foreign log_id=%s (owner child_id=%s)",
            user.id,
            log.pk,
            log.task.child.pk,
        )
        raise PermissionDenied("Ребёнок не может изменять чужие задания.")

    if is_child and new_status in (
        TaskLog.Status.APPROVED,
        TaskLog.Status.REJECTED,
    ):
        logger.warning(
            "Child user_id=%s attempted to set forbidden status=%s on log_id=%s",
            user.id,
            new_status,
            log.pk,
        )
        raise PermissionDenied("Ребёнок не может подтверждать/отклонять.")

    if not is_child and not is_parent:
        logger.warning(
            "User_id=%s with unknown role attempted status change on log_id=%s",
            user.id,
            log.pk,
        )
        raise PermissionDenied("Роль не задана.")


def _apply_status_change(log: TaskLog, new_status: str, user) -> None:
    """Записывает историю, обновляет поля лога, пересчитывает earnings."""
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
    logger.info(
        "TaskLogHistory created: log_id=%s old_status=%s new_status=%s changed_by=%s",
        log.pk,
        old_status,
        new_status,
        getattr(changed_by_user, "pk", None),
    )

    log.status = new_status
    log.updated_by = changed_by_user
    log.updated_by_parent = is_parent_user

    update_fields = ["status", "updated_by", "updated_by_parent", "updated_at"]

    if new_status in (TaskLog.Status.CANCELLED, TaskLog.Status.REJECTED):
        log.earned_amount = Decimal("0.00")
        update_fields.append("earned_amount")
        logger.debug(
            "Resetting earned_amount to 0 for log_id=%s (status=%s)",
            log.pk,
            new_status,
        )

    log.save(update_fields=update_fields)

    # Пересчёт копеек для недели этого лога (для FLEXIBLE и FIXED).
    if log.task.pk:
        start_date = log.date - timedelta(days=log.date.weekday())
        end_date = start_date + timedelta(days=6)
        logger.debug(
            "Recalculating earnings for task_id=%s week %s..%s (triggered by log_id=%s)",
            log.task.id,
            start_date,
            end_date,
            log.pk,
        )
        recalculate_task_logs_earnings(log.task, start_date, end_date)


def is_week_closed(task, log_date) -> bool:
    """True, если за неделю, содержащую log_date, для ребёнка есть закрытый отчёт."""
    start = _week_start(log_date)
    closed = WeeklyReport.objects.filter(
        child_id=task.child_id,
        start_date=start,
        status=WeeklyReport.Status.CLOSED,
    ).exists()
    if closed:
        logger.debug(
            "Week %s is closed for child_id=%s (checked via task_id=%s)",
            start,
            task.child_id,
            task.pk,
        )
    return closed


def assert_week_open(task, log_date):
    """Бросает ValidationError, если неделя закрыта."""

    if is_week_closed(task, log_date):
        logger.warning(
            "Attempt to modify log for closed week: task_id=%s child_id=%s log_date=%s",
            task.pk,
            task.child_id,
            log_date,
        )
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
        logger.warning(
            "Skipping earnings recalculation: task_id=%s has runs<=0 "
            "(schedule_type=%s, target_count=%s, target_days=%s)",
            task.pk,
            task.schedule_type,
            task.target_count,
            task.target_days,
        )
        return

    total_cents = int(task.weekly_price * 100)
    base_cents, remainder = divmod(total_cents, runs)

    logger.debug(
        "Recalculating earnings: task_id=%s week=%s..%s logs=%d runs=%d "
        "total_cents=%d base_cents=%d remainder=%d",
        task.pk,
        week_start,
        week_end,
        len(logs),
        runs,
        total_cents,
        base_cents,
        remainder,
    )

    to_update = []
    for index, log in enumerate(logs):
        if index < runs:
            cents = base_cents + (1 if index < remainder else 0)
            new_earned = Decimal(cents) / Decimal("100")
        else:
            new_earned = Decimal("0.00")

        if log.earned_amount != new_earned:
            logger.debug(
                "log_id=%s earned_amount %s -> %s",
                log.pk,
                log.earned_amount,
                new_earned,
            )
            log.earned_amount = new_earned
            to_update.append(log)

    if to_update:
        TaskLog.objects.bulk_update(to_update, ["earned_amount"])
        logger.info(
            "Updated earned_amount for %d log(s) of task_id=%s week=%s..%s",
            len(to_update),
            task.pk,
            week_start,
            week_end,
        )
    else:
        logger.debug(
            "No earned_amount changes for task_id=%s week=%s..%s",
            task.pk,
            week_start,
            week_end,
        )


def assert_not_future(log_date):
    if log_date > timezone.localdate():
        logger.warning("Attempt to mark future date: log_date=%s", log_date)
        raise ValidationError("Нельзя отмечать будущие дни.")


@transaction.atomic
def change_task_log_status(log_id, new_status, user):
    """
    Безопасно изменяет статус выполнения задания.

    Пересчёт earned_amount за неделю выполняется здесь,
    ровно один раз на изменение статуса.
    """
    logger.info(
        "change_task_log_status called: log_id=%s new_status=%s user_id=%s",
        log_id,
        new_status,
        getattr(user, "pk", None),
    )

    try:
        log = TaskLog.objects.select_for_update().get(id=log_id)
    except TaskLog.DoesNotExist:
        logger.error("TaskLog not found: log_id=%s", log_id)
        raise

    _check_status_change_permission(log, new_status, user)

    if new_status not in TaskLog.Status.values:
        logger.error(
            "Invalid status requested: log_id=%s new_status=%s", log_id, new_status
        )
        raise ValueError("Недопустимый статус выполнения.")

    if log.status == new_status:
        logger.info(
            "No-op status change: log_id=%s already has status=%s",
            log_id,
            new_status,
        )
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

    logger.info(
        "TaskLog status changed successfully: log_id=%s %s -> %s by user_id=%s",
        log.pk,
        old_status,
        new_status,
        getattr(user, "pk", None),
    )

    return log
