from datetime import date, timedelta
import json
from pywebpush import webpush, WebPushException
from django.conf import settings
from motivation.models import PushSubscription, User, Task, TaskLog, WeeklyReport


def send_weekly_report_reminders() -> int:
    """Напоминание родителям закрыть неделю (по воскресеньям)."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    sent = 0
    parents = User.objects.filter(role=User.Role.PARENT)
    for parent in parents.iterator():
        # есть ли у родителя хотя бы один ребёнок с незакрытой неделей
        has_open = (
            WeeklyReport.objects.filter(
                child__family_memberships__family__family_memberships__user=parent,
                start_date=week_start,
            )
            .exclude(status=WeeklyReport.Status.CLOSED)
            .exists()
        )
        if not has_open:
            continue
        sent += send_push_to_user(
            parent,
            "Итоги недели",
            "Пора проверить задания ребёнка и закрыть неделю.",
            url="/parent/reports",
        )
    return sent


def send_daily_task_reminders() -> int:
    """Ежедневное напоминание ребёнку о незакрытых заданиях (вечер)."""
    today = date.today()
    weekday = today.isoweekday()  # 1..7
    sent = 0
    tasks = Task.objects.filter(is_active=True).select_related("child")
    for task in tasks.iterator():
        if task.schedule_type == Task.ScheduleType.WEEKLY_DAYS:
            if weekday not in (task.target_days or []):
                continue
        already = (
            TaskLog.objects.filter(
                task=task, date=today, status=TaskLog.Status.DONE_BY_CHILD
            ).exists()
            or TaskLog.objects.filter(
                task=task, date=today, status=TaskLog.Status.APPROVED
            ).exists()
        )
        if already:
            continue
        sent += send_push_to_user(
            task.child,
            "Не забудь про задание",
            f"«{task.title}» ещё не отмечено сегодня.",
            url="/child/tasks",
        )
    return sent


def send_push_to_user(user, title, body, url="/") -> int:
    sent = 0
    for sub in PushSubscription.objects.filter(user=user):
        payload = json.dumps({"title": title, "body": body, "url": url})
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": getattr(settings, "VAPID_ADMIN_EMAIL", "admin@example.com")
                },
            )
            sent += 1
        except WebPushException as e:
            if e.response is not None and e.response.status_code == 410:
                sub.delete()
    return sent
