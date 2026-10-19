from datetime import date
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase
from django.urls import reverse

from motivation.models import User, Task, TaskLog, WeeklyReport


class WeeklyReportBusinessLogicTests(APITestCase):
    def setUp(self):
        # Создаем родителя и ребенка
        self.parent = User.objects.create_user(
            username="parent_user",
            password="password123",
            role=User.Role.PARENT,
            first_name="Ольга",
        )
        self.child = User.objects.create_user(
            username="child_user",
            password="password123",
            role=User.Role.CHILD,
            first_name="Тимур",
        )

        # Создаем активное задание для ребенка
        self.task = Task.objects.create(
            child=self.child,
            created_by=self.parent,
            title="Уборка комнаты",
            weekly_price=Decimal("350.00"),
            schedule_type=Task.ScheduleType.FLEXIBLE,
            target_count=5,
            is_active=True,
        )

        self.report_url = reverse("weekly-report-list")

    def test_weekly_report_calculation_and_final_sum(self):
        """Проверка корректности расчета суммы по логам и ручных корректировок."""
        start = date(2026, 10, 12)  # Понедельник
        end = date(2026, 10, 18)  # Воскресенье

        # Создаем отчет
        report = WeeklyReport.objects.create(
            child=self.child,
            start_date=start,
            end_date=end,
            status=WeeklyReport.Status.REVIEW,
            calculated_amount=Decimal("280.00"),  # 4 выполнения из 5
            manual_adjustment=Decimal("50.00"),  # Бонус за старание
            comment="Отличная неделя",
        )

        # Проверка вычисляемого свойства final_sum
        self.assertEqual(report.final_sum, Decimal("330.00"))

    def test_child_can_view_only_own_reports(self):
        """Ребенок видит только свои недельные отчеты."""
        other_child = User.objects.create_user(
            username="other_child", password="password123", role=User.Role.CHILD
        )

        WeeklyReport.objects.create(
            child=self.child, start_date=date(2026, 10, 12), end_date=date(2026, 10, 18)
        )
        WeeklyReport.objects.create(
            child=other_child,
            start_date=date(2026, 10, 12),
            end_date=date(2026, 10, 18),
        )

        # Авторизуемся как ребенок
        self.client.force_authenticate(user=self.child)
        response = self.client.get(self.report_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Ребенок должен видеть ровно 1 отчет (свой)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["child"], self.child.id)

    def test_parent_can_view_all_reports(self):
        """Родитель видит отчеты всех детей."""
        WeeklyReport.objects.create(
            child=self.child, start_date=date(2026, 10, 12), end_date=date(2026, 10, 18)
        )

        self.client.force_authenticate(user=self.parent)
        response = self.client.get(self.report_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
