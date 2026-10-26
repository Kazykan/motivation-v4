from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User,
    FamilyGroup,
    FamilyMembership,
    FamilyInviteCode,
    Task,
    TaskLog,
    WeeklyReport,
)

assert UserAdmin.fieldsets is not None
assert UserAdmin.add_fieldsets is not None


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Настройка отображения пользователей в админке с учетом кастомных полей."""

    fieldsets = list(UserAdmin.fieldsets) + [
        (
            "Дополнительно",
            {
                "fields": (
                    "role",
                    "telegram_id",
                    "google_id",
                    "apple_id",
                    "avatar_url",
                    "birth_date",
                    "gender",
                )
            },
        ),
    ]
    add_fieldsets = list(UserAdmin.add_fieldsets) + [
        ("Дополнительно", {"fields": ("role", "telegram_id", "birth_date", "gender")}),
    ]
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "role",
        "is_staff",
        "birth_date",
        "gender",
    )
    list_filter = ("role", "is_staff", "is_active", "gender")


class FamilyMembershipInline(admin.TabularInline):
    model = FamilyMembership
    extra = 1


@admin.register(FamilyGroup)
class FamilyGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    inlines = [FamilyMembershipInline]


@admin.register(FamilyMembership)
class FamilyMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "family", "is_owner", "joined_at")
    list_filter = ("is_owner",)


@admin.register(FamilyInviteCode)
class FamilyInviteCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "family", "created_by", "expires_at", "is_used")
    list_filter = ("is_used",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "child",
        "created_by",
        "weekly_price",
        "schedule_type",
        "is_active",
        "price_per_run",
    )
    list_filter = ("schedule_type", "is_active")
    search_fields = ("title", "description")


@admin.register(TaskLog)
class TaskLogAdmin(admin.ModelAdmin):
    list_display = ("task", "date", "status", "earned_amount", "updated_by_parent")
    list_filter = ("status", "updated_by_parent")


@admin.register(WeeklyReport)
class WeeklyReportAdmin(admin.ModelAdmin):
    list_display = (
        "child",
        "start_date",
        "end_date",
        "status",
        "calculated_amount",
        "manual_adjustment",
        "final_sum",
        "total_paid",
        "is_payout_confirmed",
    )
    list_filter = ("status", "is_payout_confirmed")
