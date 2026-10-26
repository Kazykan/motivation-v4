from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    FamilyGroup,
    FamilyMembership,
    FamilyInviteCode,
    Task,
    TaskLog,
    WeeklyReport,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "role",
            "telegram_id",
            "google_id",
            "apple_id",
            "avatar_url",
            "gender",
            "birth_date",
        )
        read_only_fields = ("id",)


class FamilyInviteCodeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyInviteCode
        fields = ("id", "code", "expires_at", "is_used")
        read_only_fields = ("id", "code", "expires_at", "is_used")

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.is_authenticated or not user.is_parent:
            raise serializers.ValidationError(
                "Только родитель может создавать инвайт-коды для приглашения."
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        membership = user.family_memberships.first()
        if not membership:
            raise serializers.ValidationError(
                "Пользователь не состоит ни в одной семье."
            )

        invite = FamilyInviteCode.objects.create(
            family=membership.family, created_by=user
        )
        return invite


class FamilyJoinSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=4, write_only=True)

    def validate_code(self, value):
        try:
            invite = FamilyInviteCode.objects.get(code=value.upper())
        except FamilyInviteCode.DoesNotExist:
            raise serializers.ValidationError("Инвайт-код не найден.")

        if not invite.is_valid:
            raise serializers.ValidationError(
                "Инвайт-код просрочен или уже был использован."
            )
        return invite

    def save(self, **kwargs):
        invite = self.validated_data["code"]
        user = self.context["request"].user

        if user.family_memberships.exists():
            raise serializers.ValidationError("Вы уже состоите в семье.")

        FamilyMembership.objects.create(family=invite.family, user=user, is_owner=False)
        invite.is_used = True
        invite.save()
        return invite.family


class TaskSerializer(serializers.ModelSerializer):
    price_per_run = serializers.ReadOnlyField()

    class Meta:
        model = Task
        fields = (
            "id",
            "child",
            "created_by",
            "title",
            "description",
            "weekly_price",
            "schedule_type",
            "target_count",
            "target_days",
            "is_active",
            "price_per_run",
            "created_at",
        )
        read_only_fields = ("id", "created_by", "created_at")

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user and request.user.is_parent:
            child = attrs.get("child")
            if not child or not child.is_child:
                raise serializers.ValidationError(
                    {
                        "child": "Задание можно назначить только пользователю с ролью ребенка."
                    }
                )
        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TaskLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLog
        fields = ("id", "task", "date", "status", "earned_amount", "updated_by_parent")
        read_only_fields = ("id", "earned_amount", "updated_by_parent")


class WeeklyReportSerializer(serializers.ModelSerializer):
    final_sum = serializers.ReadOnlyField()

    class Meta:
        model = WeeklyReport
        fields = (
            "id",
            "child",
            "start_date",
            "end_date",
            "status",
            "calculated_amount",
            "manual_adjustment",
            "comment",
            "total_paid",
            "is_payout_confirmed",
            "payout_date",
            "final_sum",
        )
        read_only_fields = ("id", "calculated_amount", "final_sum")
