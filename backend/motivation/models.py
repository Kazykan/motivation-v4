import secrets
from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

# Набор четко различимых символов (без O/0, I/1, B/8)
ALLOWED_CHARS = "2345679ACDEFGHJKMNPQRSTUVWXYZ"


def generate_short_code():
    """Генерация случайного 4-символьного кода."""
    return "".join(secrets.choice(ALLOWED_CHARS) for _ in range(4))


def get_default_expiration():
    """Срок жизни кода — 2 часа от текущего момента."""
    return timezone.now() + timedelta(hours=2)


# ----------------------------------------------------------------------
# 1. СУЩНОСТИ ПОЛЬЗОВАТЕЛЕЙ И СЕМЬИ
# ----------------------------------------------------------------------


class User(AbstractUser):
    class Role(models.TextChoices):
        PARENT = "PARENT", "Родитель"
        CHILD = "CHILD", "Ребенок"

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.PARENT,
        verbose_name="Роль в системе",
    )

    # Авторизация без пароля
    telegram_id = models.BigIntegerField(
        unique=True, null=True, blank=True, verbose_name="Telegram ID"
    )
    google_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, verbose_name="Google Sub ID"
    )
    apple_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, verbose_name="Apple User ID"
    )

    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    birth_date = models.DateField(null=True, blank=True, verbose_name="Дата рождения")

    class Gender(models.TextChoices):
        MALE = "MALE", "Мужской"
        FEMALE = "FEMALE", "Женский"

    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        null=True,
        blank=True,
        verbose_name="Пол",
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def get_role_display(self) -> str:
        return str(dict(self.Role.choices).get(self.role, self.role))

    def __str__(self):
        return f"{self.first_name or self.username} ({self.get_role_display()})"

    @property
    def is_parent(self) -> bool:
        return self.role == self.Role.PARENT

    @property
    def is_child(self) -> bool:
        return self.role == self.Role.CHILD


class FamilyGroup(models.Model):
    """Семья/Группа, объединяющая родителей и детей."""

    name = models.CharField(
        max_length=100, default="Моя семья", verbose_name="Название семьи"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Семья"
        verbose_name_plural = "Семьи"

    def __str__(self):
        return self.name


class FamilyMembership(models.Model):
    """Таблица связи: указывает, какой пользователь в какой семье состоит."""

    family = models.ForeignKey(
        FamilyGroup, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="family_memberships",
    )
    is_owner = models.BooleanField(default=False, verbose_name="Создатель семьи")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("family", "user")
        verbose_name = "Член семьи"
        verbose_name_plural = "Члены семьи"


class FamilyInviteCode(models.Model):
    family = models.ForeignKey(
        FamilyGroup,
        on_delete=models.CASCADE,
        related_name="invite_codes",
        verbose_name="Семья",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Родитель, создавший код",
    )
    code = models.CharField(
        max_length=4,
        unique=True,
        default=generate_short_code,
        db_index=True,
        verbose_name="4-значный код",
    )
    expires_at = models.DateTimeField(
        default=get_default_expiration, verbose_name="Действителен до"
    )
    is_used = models.BooleanField(default=False, verbose_name="Использован")

    class Meta:
        verbose_name = "Инвайт-код"
        verbose_name_plural = "Инвайт-коды"

    @property
    def is_valid(self) -> bool:
        """Проверка: не использован ли код и не истекли ли 2 часа."""
        return not self.is_used and timezone.now() < self.expires_at

    def save(self, *args, **kwargs):
        """Гарантируем уникальность генерируемого кода перед сохранением."""
        if not self.code:
            while True:
                new_code = generate_short_code()
                if not FamilyInviteCode.objects.filter(
                    code=new_code, is_used=False, expires_at__gt=timezone.now()
                ).exists():
                    self.code = new_code
                    break
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.created_by and not self.created_by.is_parent:
            raise ValidationError(
                "Только родитель может создавать инвайт-коды для приглашения."
            )


# ----------------------------------------------------------------------
# 2. ШАБЛОН ЗАДАНИЯ (Task)
# ----------------------------------------------------------------------

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

# ----------------------------------------------------------------------
# 1. ЗАДАНИЯ (Task)
# ----------------------------------------------------------------------


class Task(models.Model):
    """
    Задание, назначенное ребёнку родителем.

    Хранит описание задания, недельную стоимость и правила выполнения.

    Поддерживает два типа расписания:
    - FLEXIBLE: выполнить заданное количество раз за неделю.
    - FIXED: выполнять в конкретные дни недели.

    weekly_price — полная стоимость выполнения задания за неделю.
    """

    class ScheduleType(models.TextChoices):
        """Варианты расписания задания."""

        FLEXIBLE = "FLEXIBLE", "Гибкое (N раз в неделю)"
        FIXED = "FIXED", "Фиксированное (по дням недели)"

    child = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_tasks",
        limit_choices_to={"role": "CHILD"},
        verbose_name="Ребенок",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tasks",
        limit_choices_to={"role": "PARENT"},
        verbose_name="Создатель (Родитель)",
    )

    title = models.CharField(
        max_length=255,
        verbose_name="Название задания",
    )

    description = models.TextField(
        blank=True,
        verbose_name="Описание",
    )

    weekly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Стоимость за неделю",
    )

    schedule_type = models.CharField(
        max_length=10,
        choices=ScheduleType.choices,
        default=ScheduleType.FLEXIBLE,
    )

    target_count = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(7),
        ],
        verbose_name="Целевое количество выполнений",
    )

    target_days = models.JSONField(
        default=list,
        null=True,
        blank=True,
        verbose_name="Дни недели (1-Пн, 7-Вс)",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Активно в текущее время",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Возвращает название задания и имя назначенного ребёнка."""

        return (
            f"{self.title} " f"({self.child.username if self.child else 'Без ребенка'})"
        )

    class Meta:
        verbose_name = "Задание"
        verbose_name_plural = "Задания"

        constraints = [
            models.UniqueConstraint(
                fields=["child", "title"],
                condition=models.Q(is_active=True),
                name="unique_active_task_title_per_child",
            )
        ]

    def clean(self):
        """
        Проверяет корректность настроек расписания.

        Для гибкого задания обязательно количество выполнений.
        Для фиксированного задания обязательно указать дни недели.
        """

        super().clean()

        if self.schedule_type == self.ScheduleType.FLEXIBLE and not self.target_count:
            raise ValidationError(
                {
                    "target_count": (
                        "Для гибкого задания укажите количество " "выполнений в неделю."
                    )
                }
            )

        if self.schedule_type == self.ScheduleType.FIXED and not self.target_days:
            raise ValidationError(
                {
                    "target_days": (
                        "Для фиксированного задания выберите " "хотя бы один день."
                    )
                }
            )

        if self.schedule_type == self.ScheduleType.FIXED:
            if not isinstance(self.target_days, list):
                raise ValidationError(
                    {"target_days": "Дни недели должны быть списком."}
                )

            if any(
                not isinstance(day, int) or isinstance(day, bool) or day < 1 or day > 7
                for day in self.target_days
            ):
                raise ValidationError(
                    {"target_days": ("Допустимые значения дней недели: от 1 до 7.")}
                )

            if len(self.target_days) != len(set(self.target_days)):
                raise ValidationError(
                    {"target_days": "Дни недели не должны повторяться."}
                )

    def get_run_amounts(self):
        """
        Распределяет недельную стоимость между целевыми выполнениями.

        Остаток от деления распределяется по одной копейке,
        начиная с первого выполнения.

        Пример:
        weekly_price = 100.00, target_count = 3.

        Результат:
        [33.34, 33.33, 33.33]

        Дополнительные выполнения сверх цели не оплачиваются.
        Для них сервис создания TaskLog должен устанавливать
        earned_amount = Decimal("0.00").
        """

        if self.schedule_type == self.ScheduleType.FLEXIBLE:
            runs = self.target_count or 0
        else:
            runs = len(self.target_days or [])

        if runs <= 0:
            return []

        total_cents = int(self.weekly_price * 100)

        base_cents, remainder = divmod(total_cents, runs)

        amounts = []

        for index in range(runs):
            cents = base_cents + (1 if index < remainder else 0)

            amounts.append(Decimal(cents) / Decimal("100"))

        return amounts

    @property
    def price_per_run(self):
        """
        Возвращает стоимость первого оплачиваемого выполнения.

        Внимание: стоимость отдельных выполнений может отличаться
        на одну копейку из-за распределения остатка.

        Для расчёта выплат используйте get_run_amounts(),
        а не умножение этого свойства на количество выполнений.
        """

        amounts = self.get_run_amounts()

        return amounts[0] if amounts else Decimal("0.00")


# ----------------------------------------------------------------------
# 2. ЕЖЕДНЕВНЫЕ ОТМЕТКИ (TaskLog)
# ----------------------------------------------------------------------


class TaskLog(models.Model):
    """
    Отдельное выполнение задания ребёнком.

    Одна запись соответствует одному выполнению в определённую дату.

    Статусы:
    - PENDING: выполнение ещё не отмечено.
    - DONE: ребёнок сообщил о выполнении.
    - APPROVED: родитель подтвердил выполнение.
    - REJECTED: родитель отклонил выполнение.

    Родитель может изменять статус в любое время,
    пока соответствующая неделя не закрыта.

    earned_amount хранит денежную сумму конкретного выполнения.
    Пересчёт earned_amount выполняется сервисом
    motivation.services.task_logs.change_task_log_status
    при изменении статуса, а не в save().
    """

    class Status(models.TextChoices):
        """Статусы выполнения задания."""

        PENDING = "PENDING", "Ожидает выполнения"
        DONE_BY_CHILD = "DONE", "Отмечено ребенком"
        APPROVED = "APPROVED", "Подтверждено родителем"
        REJECTED = "REJECTED", "Отклонено родителем"
        CANCELLED = "CANCELLED", "Отменено (удалено)"

    task = models.ForeignKey(
        Task,
        on_delete=models.PROTECT,
        related_name="logs",
    )

    date = models.DateField(
        verbose_name="Дата выполнения",
    )

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
    )

    earned_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Стоимость выполнения",
    )

    updated_by_parent = models.BooleanField(
        default=False,
        verbose_name="Отмечено родителем задним числом",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_task_logs",
        verbose_name="Последний изменивший пользователь",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Последнее изменение",
    )

    class Meta:
        verbose_name = "Лог выполнения задания"
        verbose_name_plural = "Логи выполнения заданий"

        unique_together = ("task", "date")
        ordering = ["-date", "-id"]

    def __str__(self):
        """Возвращает название задания, дату и текущий статус."""

        task_title = self.task.title if self.task_id else "Без задания"
        return f"{task_title} — {self.date} — {self.get_status_display()}"


# ----------------------------------------------------------------------
# 3. ИСТОРИЯ ИЗМЕНЕНИЙ (TaskLogHistory)
# ----------------------------------------------------------------------


class TaskLogHistory(models.Model):
    """
    История изменения статусов выполнения задания.

    Создаётся при каждом изменении статуса TaskLog.

    Позволяет определить:
    - какой статус был установлен ранее;
    - какой статус установлен сейчас;
    - кто выполнил изменение;
    - когда произошло изменение.

    Записи истории не редактируются при обычной работе приложения.
    """

    log = models.ForeignKey(
        TaskLog,
        on_delete=models.CASCADE,
        related_name="history",
        verbose_name="Выполнение задания",
    )

    old_status = models.CharField(
        max_length=15,
        choices=TaskLog.Status.choices,
        verbose_name="Предыдущий статус",
    )

    new_status = models.CharField(
        max_length=15,
        choices=TaskLog.Status.choices,
        verbose_name="Новый статус",
    )

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="task_log_history",
        verbose_name="Кто изменил",
    )

    changed_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата изменения",
    )

    class Meta:
        verbose_name = "История выполнения задания"
        verbose_name_plural = "История выполнений заданий"
        ordering = ["-changed_at"]

        indexes = [
            models.Index(
                fields=["log", "-changed_at"],
                name="tasklog_history_date_idx",
            )
        ]

    def __str__(self):
        """Показывает изменение статуса и дату."""

        return f"{self.log.task.title}: " f"{self.old_status} → {self.new_status}"


# ----------------------------------------------------------------------
# 4. НЕДЕЛЬНЫЙ ОТЧЕТ И ВЫПЛАТЫ (WeeklyReport)
# ----------------------------------------------------------------------


class WeeklyReport(models.Model):
    """
    Финансовый отчёт ребёнка за календарную неделю.

    Хранит:
    - рассчитанную сумму заработка;
    - ручные корректировки;
    - итоговую сумму к выплате;
    - состояние выплаты.

    После закрытия отчёта неделя считается завершённой.
    """

    class Status(models.TextChoices):
        """Состояния недельного отчёта."""

        DRAFT = "DRAFT", "Текущая неделя"
        REVIEW = "REVIEW", "На проверке родителем"
        CLOSED = "CLOSED", "Закрыта и выплачена"

    child = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_reports",
        limit_choices_to={"role": "CHILD"},
        verbose_name="Ребенок",
    )

    start_date = models.DateField(
        verbose_name="Начало недели (Понедельник)",
    )

    end_date = models.DateField(
        verbose_name="Конец недели (Воскресенье)",
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    calculated_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Заработано по логам",
    )

    manual_adjustment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Корректировка (бонус/штраф)",
    )

    comment = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Причина корректировки",
    )

    total_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Итого выплачено",
    )

    is_payout_confirmed = models.BooleanField(
        default=False,
        verbose_name="Отметка о физической выплате",
    )

    payout_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата/время выплаты",
    )

    class Meta:
        verbose_name = "Недельный отчет"
        verbose_name_plural = "Недельные отчеты"

        unique_together = ("child", "start_date")

    @property
    def final_sum(self):
        """
        Возвращает итоговую сумму с учётом ручных корректировок.

        calculated_amount — заработок по подтверждённым логам.
        manual_adjustment — дополнительный бонус или штраф.
        """

        return self.calculated_amount + self.manual_adjustment
