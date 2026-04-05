from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("disputes", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dispute",
            name="category",
            field=models.CharField(
                choices=[
                    ("payment", "Payment"),
                    ("service_quality", "Service Quality"),
                    ("behavior", "Behavior"),
                    ("abuse", "Abuse"),
                    ("other", "Other"),
                ],
                max_length=50,
            ),
        ),
    ]
