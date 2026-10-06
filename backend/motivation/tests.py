from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase
from django.utils import timezone

from motivation.models import (
    ALLOWED_CHARS,
    FamilyInviteCode,
    Task,
    User,
    WeeklyReport,
    generate_short_code,
    get_default_expiration,
)


class ModelHelpersTests(SimpleTestCase):
    def test_generate_short_code_returns_valid_length_and_charset(self):
        code = generate_short_code()

        self.assertEqual(len(code), 4)
        self.assertTrue(set(code) <= set(ALLOWED_CHARS))

    def test_get_default_expiration_is_two_hours_in_future(self):
        before = timezone.now()
        expiration = get_default_expiration()
        after = timezone.now()

        self.assertGreater(expiration, before + timedelta(hours=1, minutes=59))
        self.assertLess(expiration, after + timedelta(hours=2, minutes=1))


class UserModelTests(SimpleTestCase):
    def test_user_role_properties_and_string_representation(self):
        parent = User(first_name="Мария", username="maria", role=User.Role.PARENT)
        child = User(first_name="Иван", username="ivan", role=User.Role.CHILD)

        self.assertTrue(parent.is_parent)
        self.assertFalse(parent.is_child)
        self.assertFalse(child.is_parent)
        self.assertTrue(child.is_child)
        self.assertEqual(str(parent), "Мария (Родитель)")
        self.assertEqual(str(child), "Иван (Ребенок)")


class FamilyInviteCodeTests(SimpleTestCase):
    def test_invite_code_is_valid_only_when_unused_and_not_expired(self):
        future = timezone.now() + timedelta(hours=1)
        expired = timezone.now() - timedelta(minutes=5)

        valid_code = FamilyInviteCode(is_used=False, expires_at=future)
        used_code = FamilyInviteCode(is_used=True, expires_at=future)
        expired_code = FamilyInviteCode(is_used=False, expires_at=expired)

        self.assertTrue(valid_code.is_valid)
        self.assertFalse(used_code.is_valid)
        self.assertFalse(expired_code.is_valid)


class TaskModelTests(SimpleTestCase):
    def test_flexible_task_requires_target_count(self):
        task = Task(
            title="Сбор игрушек",
            weekly_price=Decimal("50.00"),
            schedule_type=Task.ScheduleType.FLEXIBLE,
            target_count=None,
        )

        with self.assertRaises(ValidationError):
            task.clean()

    def test_fixed_task_requires_target_days(self):
        task = Task(
            title="Чтение",
            weekly_price=Decimal("30.00"),
            schedule_type=Task.ScheduleType.FIXED,
            target_days=[],
        )

        with self.assertRaises(ValidationError):
            task.clean()

    def test_price_per_run_uses_target_count_for_flexible_tasks(self):
        task = Task(
            title="Планер",
            weekly_price=Decimal("42.00"),
            schedule_type=Task.ScheduleType.FLEXIBLE,
            target_count=3,
        )

        self.assertEqual(task.price_per_run, 14.0)

    def test_price_per_run_uses_number_of_days_for_fixed_tasks(self):
        task = Task(
            title="Прогулка",
            weekly_price=Decimal("28.00"),
            schedule_type=Task.ScheduleType.FIXED,
            target_days=[1, 3, 5],
        )

        self.assertEqual(task.price_per_run, 9.33)


class WeeklyReportTests(SimpleTestCase):
    def test_final_sum_adds_manual_adjustment_to_calculated_amount(self):
        report = WeeklyReport(calculated_amount=Decimal("500.00"), manual_adjustment=Decimal("-25.50"))

        self.assertEqual(report.final_sum, Decimal("474.50"))
