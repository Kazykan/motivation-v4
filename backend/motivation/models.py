import secrets
from datetime import timedelta

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

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

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


# ----------------------------------------------------------------------
# 2. ШАБЛОН ЗАДАНИЯ (Task)
# ----------------------------------------------------------------------


class Task(models.Model):
    class ScheduleType(models.TextChoices):
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
    title = models.CharField(max_length=255, verbose_name="Название задания")
    description = models.TextField(blank=True, verbose_name="Описание")

    # Полная стоимость выполнения за ВСЮ неделю
    weekly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Стоимость за неделю",
    )

    schedule_type = models.CharField(
        max_length=10, choices=ScheduleType.choices, default=ScheduleType.FLEXIBLE
    )

    # Для FLEXIBLE: сколько раз за неделю нужно сделать (например, 3)
    target_count = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(7)],
        verbose_name="Целевое количество выполнений",
    )

    # Для FIXED: список дней [1, 3, 4, 7] (1=Пн, 7=Вс)
    target_days = ArrayField(
        models.PositiveSmallIntegerField(
            validators=[MinValueValidator(1), MaxValueValidator(7)]
        ),
        null=True,
        blank=True,
        verbose_name="Дни недели (1-Пн, 7-Вс)",
    )

    is_active = models.BooleanField(
        default=True, verbose_name="Активно в текущее время"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Задание"
        verbose_name_plural = "Задания"
        constraints = [
            # Запрещаем дубликаты названий у одного ребенка СРЕДИ АКТИВНЫХ заданий!
            models.UniqueConstraint(
                fields=["child", "title"],
                condition=models.Q(is_active=True),
                name="unique_active_task_title_per_child",
            )
        ]

    def clean(self):
        """Валидация бизнес-правил расписания."""
        if self.schedule_type == self.ScheduleType.FLEXIBLE and not self.target_count:
            raise ValidationError(
                {
                    "target_count": "Для гибкого задания укажите количество выполнений в неделю."
                }
            )

        if self.schedule_type == self.ScheduleType.FIXED and not self.target_days:
            raise ValidationError(
                {
                    "target_days": "Для фиксированного задания выберите хотя бы один день."
                }
            )

    @property
    def price_per_run(self) -> float:
        """Стоимость одного выполнения (деление без остатка)."""
        runs = (
            self.target_count
            if self.schedule_type == self.ScheduleType.FLEXIBLE
            else len(self.target_days or [])
        )
        if not runs:
            return 0.0
        return round(float(self.weekly_price) / runs, 2)


# ----------------------------------------------------------------------
# 3. ЕЖЕДНЕВНЫЕ ОТМЕТКИ И ВЫПОЛНЕНИЕ (TaskLog)
# ----------------------------------------------------------------------


class TaskLog(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Ожидает выполнения"
        DONE_BY_CHILD = "DONE", "Отмечено ребенком"
        APPROVED = "APPROVED", "Подтверждено родителем"
        REJECTED = "REJECTED", "Отклонено родителем"

    task = models.ForeignKey(Task, on_delete=models.PROTECT, related_name="logs")
    date = models.DateField(verbose_name="Дата выполнения")

    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING
    )

    # Фиксируем стоимость на момент выполнения
    earned_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Флаг, если родитель проставил статус за прошлый день вручную
    updated_by_parent = models.BooleanField(
        default=False, verbose_name="Отмечено родителем задним числом"
    )

    class Meta:
        verbose_name = "Лог выполнения задания"
        verbose_name_plural = "Логи выполнения заданий"
        unique_together = ("task", "date")


# ----------------------------------------------------------------------
# 4. НЕДЕЛЬНЫЙ ОТЧЕТ И ВЫПЛАТЫ (WeeklyReport)
# ----------------------------------------------------------------------


class WeeklyReport(models.Model):
    class Status(models.TextChoices):
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
    start_date = models.DateField(verbose_name="Начало недели (Понедельник)")
    end_date = models.DateField(verbose_name="Конец недели (Воскресенье)")

    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )

    calculated_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name="Заработано по логам"
    )
    manual_adjustment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Корректировка (бонус/штраф)",
    )
    comment = models.CharField(
        max_length=255, blank=True, verbose_name="Причина корректировки"
    )

    total_paid = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name="Итого выплачено"
    )

    is_payout_confirmed = models.BooleanField(
        default=False, verbose_name="Отметка о физической выплате"
    )
    payout_date = models.DateTimeField(
        null=True, blank=True, verbose_name="Дата/время выплаты"
    )

    class Meta:
        verbose_name = "Недельный отчет"
        verbose_name_plural = "Недельные отчеты"
        unique_together = ("child", "start_date")

    @property
    def final_sum(self):
        """Итоговая сумма с учетом бонусов/штрафов."""
        return self.calculated_amount + self.manual_adjustment
