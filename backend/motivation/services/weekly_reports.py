from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError
from motivation.models import Task, TaskLog, WeeklyReport


def week_bounds(any_date: date) -> tuple[date, date]:
    start = any_date - timedelta(days=any_date.weekday())
    return start, start + timedelta(days=6)


def planned_runs_count(task: Task) -> int:
    if task.schedule_type == Task.ScheduleType.FLEXIBLE:
        return task.target_count or 0
    return len(task.target_days or [])


def build_week_forecast(child_id: int, week_start: date) -> dict:
    """Возвращает прогноз по всем активным заданиям ребёнка за неделю."""
    week_end = week_start + timedelta(days=6)
    tasks = Task.objects.filter(child_id=child_id, is_active=True).order_by(
        "title", "id"
    )

    items = []
    total_planned = Decimal("0.00")
    total_earned = Decimal("0.00")
    total_pending = Decimal("0.00")

    for task in tasks:
        logs = list(
            task.logs.filter(date__range=[week_start, week_end]).order_by("date", "id")
        )
        approved = [l for l in logs if l.status == TaskLog.Status.APPROVED]
        done = [l for l in logs if l.status == TaskLog.Status.DONE_BY_CHILD]

        earned = sum((l.earned_amount for l in approved), Decimal("0.00"))
        pending_amount = (
            sum((Decimal(task.price_per_run) for _ in done), Decimal("0.00"))
            if done
            else Decimal("0.00")
        )

        planned = task.weekly_price
        remaining = max(Decimal("0.00"), planned - earned)

        items.append(
            {
                "taskId": task.id,
                "title": task.title,
                "scheduleType": task.schedule_type,
                "weeklyPrice": str(planned),
                "plannedRuns": planned_runs_count(task),
                "approvedCount": len(approved),
                "pendingCount": len(done),
                "earned": str(earned),
                "pendingAmount": str(pending_amount),
                "remaining": str(remaining),
                "targetDays": task.target_days or [],
            }
        )

        total_planned += planned
        total_earned += earned
        total_pending += pending_amount

    return {
        "weekStart": week_start.isoformat(),
        "weekEnd": week_end.isoformat(),
        "childId": child_id,
        "items": items,
        "summary": {
            "planned": str(total_planned),
            "earned": str(total_earned),
            "pendingAmount": str(total_pending),
            "forecast": str(total_earned + total_pending),
            "remaining": str(max(Decimal("0.00"), total_planned - total_earned)),
        },
    }


@transaction.atomic
def close_week(child_id: int, week_start: date, user, payload: dict) -> WeeklyReport:
    """Закрывает неделю: фиксирует рассчитанную сумму и корректировку."""
    week_end = week_start + timedelta(days=6)

    # Нельзя закрывать неделю, пока не наступило воскресенье (конец недели).
    today = date.today()
    if today < week_end:
        raise ValidationError(
            "Закрыть неделю можно только после её окончания (воскресенье)."
        )

    approved = TaskLog.objects.filter(
        task__child_id=child_id,
        date__range=[week_start, week_end],
        status=TaskLog.Status.APPROVED,
    )
    calculated = sum((l.earned_amount for l in approved), Decimal("0.00"))

    manual = Decimal(str(payload.get("manual_adjustment") or 0))
    report, _ = WeeklyReport.objects.get_or_create(
        child_id=child_id, start_date=week_start, defaults={"end_date": week_end}
    )
    report.end_date = week_end
    report.calculated_amount = calculated
    report.manual_adjustment = manual
    report.comment = payload.get("comment") or ""
    report.total_paid = calculated + manual
    report.is_payout_confirmed = bool(payload.get("is_payout_confirmed"))
    if report.is_payout_confirmed:
        from django.utils import timezone

        report.payout_date = timezone.now()
    report.status = WeeklyReport.Status.CLOSED
    report.save()
    return report


def week_start_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def build_report_drafts(child_ids, week_start: date) -> list[dict]:
    """Возвращает «черновик» отчёта по каждому ребёнку за неделю.

    Если WeeklyReport уже существует — отдаёт сохранённые поля.
    Если нет — считает из APPROVED-логов, как в weekly_review.
    """
    week_end = week_start + timedelta(days=6)
    today = date.today()
    can_close = today >= week_end
    existing = {
        r.child_id: r
        for r in WeeklyReport.objects.filter(
            child_id__in=child_ids, start_date=week_start
        )
    }

    result = []
    for child_id in child_ids:
        report = existing.get(child_id)

        if report:
            result.append(
                {
                    "id": report.id,
                    "child": child_id,
                    "start_date": report.start_date.isoformat(),
                    "end_date": report.end_date.isoformat(),
                    "status": report.status,
                    "calculated_amount": str(report.calculated_amount),
                    "manual_adjustment": str(report.manual_adjustment),
                    "comment": report.comment,
                    "total_paid": str(report.total_paid),
                    "is_payout_confirmed": report.is_payout_confirmed,
                    "payout_date": (
                        report.payout_date.isoformat() if report.payout_date else None
                    ),
                    "final_sum": str(report.final_sum),
                    "is_draft": False,
                    "can_close": False,
                }
            )
            continue

        approved = TaskLog.objects.filter(
            task__child_id=child_id,
            date__range=[week_start, week_end],
            status=TaskLog.Status.APPROVED,
        )
        calculated = sum((l.earned_amount for l in approved), Decimal("0.00"))

        result.append(
            {
                "id": None,
                "child": child_id,
                "start_date": week_start.isoformat(),
                "end_date": week_end.isoformat(),
                "status": WeeklyReport.Status.REVIEW,
                "calculated_amount": str(calculated),
                "manual_adjustment": "0.00",
                "comment": "",
                "total_paid": "0.00",
                "is_payout_confirmed": False,
                "payout_date": None,
                "final_sum": str(calculated),
                "is_draft": True,
                "can_close": can_close,
            }
        )

    return result
