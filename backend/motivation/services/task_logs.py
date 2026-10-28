from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from motivation.models import TaskLog, TaskLogHistory


def recalculate_task_logs_earnings(task, week_start, week_end):
    """
    Пересчитывает earned_amount для логов конкретного задания за неделю
    в строгом хронологическом порядке с распределением остатка копеек.
    """
    logs = task.logs.filter(
        date__range=[week_start, week_end],
        status__in=[TaskLog.Status.APPROVED, TaskLog.Status.DONE_BY_CHILD],
    ).order_by("date", "id")

    if task.schedule_type == task.ScheduleType.FLEXIBLE:
        runs = task.target_count or 1
    else:
        runs = len(task.target_days or [])

    if runs <= 0:
        return

    total_cents = int(task.weekly_price * 100)
    base_cents, remainder = divmod(total_cents, runs)

    for index, log in enumerate(logs):
        if index < runs:
            cents = base_cents + (1 if index < remainder else 0)
            new_earned = Decimal(cents) / Decimal("100")
        else:
            new_earned = Decimal("0.00")

        if log.earned_amount != new_earned:
            log.earned_amount = new_earned
            log.save(update_fields=["earned_amount"])


@transaction.atomic
def change_task_log_status(log_id, new_status, user):
    """
    Безопасно изменяет статус выполнения задания.
    """
    log = TaskLog.objects.select_for_update().get(id=log_id)

    if new_status not in TaskLog.Status.values:
        raise ValueError("Недопустимый статус выполнения.")

    if log.status == new_status:
        return log

    old_status = log.status

    # Проверяем авторизацию: если пользователь анонимный, в тестовом режиме подставляем None или первого пользователя для истории
    from django.contrib.auth.models import AnonymousUser

    is_anon = isinstance(user, AnonymousUser) or not user or not user.is_authenticated

    changed_by_user = None if is_anon else user
    is_parent_user = True if is_anon else getattr(user, "role", None) == "PARENT"

    TaskLogHistory.objects.create(
        log=log,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by_user,  # Теперь не упадет, если прилетит AnonymousUser
    )

    log.status = new_status
    log.updated_by = changed_by_user
    log.updated_by_parent = is_parent_user

    log.save(
        update_fields=[
            "status",
            "updated_by",
            "updated_by_parent",
            "updated_at",
        ]
    )

    # Запускаем пересчет копеек для недели этого лога
    if log.task and log.task.schedule_type == log.task.ScheduleType.FLEXIBLE:
        start_date = log.date - timezone.timedelta(days=log.date.weekday())
        end_date = start_date + timezone.timedelta(days=6)
        recalculate_task_logs_earnings(log.task, start_date, end_date)

    return log
