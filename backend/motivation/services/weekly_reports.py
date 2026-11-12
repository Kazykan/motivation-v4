# backend/motivation/services/weekly_review.py
from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable

from django.db.models import Prefetch, Sum
from django.utils import timezone

from django.db.models import Prefetch

from motivation.models import Task, TaskLog, WeeklyReport, User

# ─────────────────────────────────────────────────────────────
# Утилиты для работы с неделей
# ─────────────────────────────────────────────────────────────


def week_start_of(d: date) -> date:
    """Понедельник недели, содержащей d."""
    return d - timedelta(days=d.weekday())


def week_bounds(d: date) -> tuple[date, date]:
    """(понедельник, воскресенье) недели, содержащей d."""
    start = week_start_of(d)
    return start, start + timedelta(days=6)


# ─────────────────────────────────────────────────────────────
# Общие хелперы
# ─────────────────────────────────────────────────────────────


def _child_payload(child: User | None) -> dict:
    if child is None:
        return {"id": None, "name": "Ребёнок", "age": None, "avatar": ""}

    age = None
    if child.birth_date:
        today = date.today()
        age = (
            today.year
            - child.birth_date.year
            - (
                (today.month, today.day)
                < (child.birth_date.month, child.birth_date.day)
            )
        )

    return {
        "id": child.id,
        "name": child.first_name or child.username or "Ребёнок",
        "age": age,
        "avatar": child.avatar_url or "",
    }


def _planned_runs(task: Task) -> int:
    if task.schedule_type == Task.ScheduleType.FLEXIBLE:
        return task.target_count or 0
    return len(task.target_days or [])


# ─────────────────────────────────────────────────────────────
# Обзор задач за неделю (используется /tasks/weekly-review/)
# ─────────────────────────────────────────────────────────────


def build_weekly_review(child_id: int, start_date: date, end_date: date) -> list[dict]:
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

    week_closed = WeeklyReport.objects.filter(
        child_id=child_id,
        start_date=start_date,
        status=WeeklyReport.Status.CLOSED,
    ).exists()

    result = []
    for task in tasks:
        approved_count = pending_count = rejected_count = 0
        calculated_amount = Decimal("0.00")
        logs_data = []

        for log in task.filtered_logs:
            if log.status == TaskLog.Status.APPROVED:
                approved_count += 1
                calculated_amount += log.earned_amount
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
                "child": _child_payload(task.child),
                "pricePerRun": str(task.price_per_run),
                "summary": {
                    "approvedCount": approved_count,
                    "pendingCount": pending_count,
                    "rejectedCount": rejected_count,
                    "calculatedAmount": str(round(float(calculated_amount), 2)),
                },
                "logs": logs_data,
            }
        )

    return result


# ─────────────────────────────────────────────────────────────
# Прогноз на неделю (используется /tasks/my-weekly-report/)
# ─────────────────────────────────────────────────────────────


def build_week_forecast(child_id: int, week_start: date) -> dict:
    week_end = week_start + timedelta(days=6)

    tasks = (
        Task.objects.filter(child_id=child_id, is_active=True)
        .order_by("title", "id")
        .prefetch_related(
            Prefetch(
                "logs",
                queryset=TaskLog.objects.filter(date__range=[week_start, week_end]),
                to_attr="week_logs",
            )
        )
    )

    items = []
    planned_total = Decimal("0.00")
    earned_total = Decimal("0.00")
    pending_total = Decimal("0.00")

    for task in tasks:
        planned_runs = _planned_runs(task)
        if planned_runs <= 0:
            continue

        price_per_run = (task.weekly_price / Decimal(planned_runs)).quantize(
            Decimal("0.01")
        )

        approved_count = pending_count = 0
        earned = Decimal("0.00")
        pending_amount = Decimal("0.00")

        for log in task.week_logs:
            if log.status == TaskLog.Status.APPROVED:
                approved_count += 1
                earned += log.earned_amount
            elif log.status == TaskLog.Status.DONE_BY_CHILD:
                pending_count += 1
                pending_amount += price_per_run

        # Количество оставшихся оплачиваемых выполнений
        remaining_runs = max(0, planned_runs - approved_count - pending_count)
        remaining = price_per_run * remaining_runs

        planned_total += task.weekly_price
        earned_total += earned
        pending_total += pending_amount

        items.append(
            {
                "taskId": task.id,
                "title": task.title,
                "scheduleType": task.schedule_type,
                "weeklyPrice": str(task.weekly_price),
                "plannedRuns": planned_runs,
                "approvedCount": approved_count,
                "pendingCount": pending_count,
                "earned": str(earned),
                "pendingAmount": str(pending_amount),
                "remaining": str(remaining),
                "targetDays": task.target_days or [],
            }
        )

    forecast = (
        earned_total + pending_total + sum(Decimal(i["remaining"]) for i in items)
    )

    return {
        "weekStart": week_start.isoformat(),
        "weekEnd": week_end.isoformat(),
        "childId": child_id,
        "items": items,
        "summary": {
            "planned": str(planned_total),
            "earned": str(earned_total),
            "pendingAmount": str(pending_total),
            "forecast": str(forecast),
            "remaining": str(planned_total - earned_total - pending_total),
        },
    }


# ─────────────────────────────────────────────────────────────
# Черновики недельных отчётов (используется /tasks/reports-overview/)
# ─────────────────────────────────────────────────────────────


def build_report_drafts(child_ids: Iterable[int], week_start: date) -> list[dict]:
    week_end = week_start + timedelta(days=6)
    drafts: list[dict] = []

    for child_id in child_ids:
        # Уже существующий отчёт — берём его значения
        report = WeeklyReport.objects.filter(
            child_id=child_id, start_date=week_start
        ).first()

        # Пересчитываем сумму по подтверждённым логам на случай, если отчёта ещё нет
        calculated = TaskLog.objects.filter(
            task__child_id=child_id,
            date__range=[week_start, week_end],
            status=TaskLog.Status.APPROVED,
        ).aggregate(total=Sum("earned_amount"))["total"] or Decimal("0.00")

        manual_adjustment = report.manual_adjustment if report else Decimal("0.00")
        final_sum = calculated + manual_adjustment

        today = date.today()
        # Закрыть неделю можно только после её окончания
        can_close = today > week_end and (
            report is None or report.status != WeeklyReport.Status.CLOSED
        )

        drafts.append(
            {
                "id": report.id if report else None,
                "child": child_id,
                "start_date": week_start.isoformat(),
                "end_date": week_end.isoformat(),
                "status": report.status if report else WeeklyReport.Status.DRAFT,
                "calculated_amount": str(calculated),
                "manual_adjustment": str(manual_adjustment),
                "comment": report.comment if report else "",
                "total_paid": str(report.total_paid) if report else "0.00",
                "is_payout_confirmed": (
                    bool(report.is_payout_confirmed) if report else False
                ),
                "payout_date": (
                    report.payout_date.isoformat()
                    if report and report.payout_date
                    else None
                ),
                "final_sum": str(final_sum),
                "is_draft": report is None,
                "can_close": can_close,
            }
        )

    return drafts


# ─────────────────────────────────────────────────────────────
# Закрытие недели (используется /tasks/close-week/)
# ─────────────────────────────────────────────────────────────


def close_week(
    child_id: int,
    week_start: date,
    user: User,
    payload: dict,
) -> WeeklyReport:
    """
    Закрывает неделю:
    - создаёт/обновляет WeeklyReport;
    - фиксирует итоговую сумму (calculated_amount + manual_adjustment);
    - ставит статус CLOSED и отметку о выплате.

    Бросает django.core.exceptions.ValidationError при нарушении правил.
    """
    from django.core.exceptions import ValidationError

    child = User.objects.filter(id=child_id, role=User.Role.CHILD).first()
    if not child:
        raise ValidationError("Ребёнок не найден.")

    week_end = week_start + timedelta(days=6)
    today = date.today()

    if today <= week_end:
        raise ValidationError("Неделю можно закрыть только после её окончания.")

    report = WeeklyReport.objects.filter(child=child, start_date=week_start).first()

    if report and report.status == WeeklyReport.Status.CLOSED:
        raise ValidationError("Неделя уже закрыта.")

    calculated = TaskLog.objects.filter(
        task__child_id=child_id,
        date__range=[week_start, week_end],
        status=TaskLog.Status.APPROVED,
    ).aggregate(total=Sum("earned_amount"))["total"] or Decimal("0.00")

    manual_adjustment = Decimal(str(payload.get("manual_adjustment", 0) or 0))
    comment = str(payload.get("comment", "") or "")
    is_payout_confirmed = bool(payload.get("is_payout_confirmed", True))
    final_sum = calculated + manual_adjustment

    if report is None:
        report = WeeklyReport(child=child, start_date=week_start, end_date=week_end)

    report.end_date = week_end
    report.status = WeeklyReport.Status.CLOSED
    report.calculated_amount = calculated
    report.manual_adjustment = manual_adjustment
    report.comment = comment
    report.total_paid = final_sum
    report.is_payout_confirmed = is_payout_confirmed
    report.payout_date = timezone.now() if is_payout_confirmed else None
    report.save()

    return report
