# backend/motivation/services/task_logs.py
from decimal import Decimal

from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.utils import timezone

from motivation.models import TaskLog, TaskLogHistory


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


@transaction.atomic
def change_task_log_status(log_id, new_status, user):
    """
    Безопасно изменяет статус выполнения задания.

    Пересчёт earned_amount за неделю выполняется здесь,
    ровно один раз на изменение статуса.
    """
    log = TaskLog.objects.select_for_update().get(id=log_id)

    if new_status not in TaskLog.Status.values:
        raise ValueError("Недопустимый статус выполнения.")

    if log.status == new_status:
        return log

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

    if new_status == TaskLog.Status.CANCELLED:
        log.earned_amount = Decimal("0.00")
        update_fields.append("earned_amount")

    log.save(update_fields=update_fields)

    # Пересчёт копеек для недели этого лога (для FLEXIBLE и FIXED).
    if log.task_id:
        start_date = log.date - timezone.timedelta(days=log.date.weekday())
        end_date = start_date + timezone.timedelta(days=6)
        recalculate_task_logs_earnings(log.task, start_date, end_date)

    return log
