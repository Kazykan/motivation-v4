from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("motivation", "0004_tasklog_updated_at_tasklog_updated_by_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tasklog",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Ожидает выполнения"),
                    ("DONE", "Отмечено ребенком"),
                    ("APPROVED", "Подтверждено родителем"),
                    ("REJECTED", "Отклонено родителем"),
                    ("CANCELLED", "Отменено (удалено)"),
                ],
                default="PENDING",
                max_length=15,
            ),
        ),
        migrations.AlterField(
            model_name="taskloghistory",
            name="old_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Ожидает выполнения"),
                    ("DONE", "Отмечено ребенком"),
                    ("APPROVED", "Подтверждено родителем"),
                    ("REJECTED", "Отклонено родителем"),
                    ("CANCELLED", "Отменено (удалено)"),
                ],
                max_length=15,
                verbose_name="Предыдущий статус",
            ),
        ),
        migrations.AlterField(
            model_name="taskloghistory",
            name="new_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Ожидает выполнения"),
                    ("DONE", "Отмечено ребенком"),
                    ("APPROVED", "Подтверждено родителем"),
                    ("REJECTED", "Отклонено родителем"),
                    ("CANCELLED", "Отменено (удалено)"),
                ],
                max_length=15,
                verbose_name="Новый статус",
            ),
        ),
    ]
