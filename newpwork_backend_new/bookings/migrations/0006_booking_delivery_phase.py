from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0005_booking_tiers_and_client_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="delivery_phase",
            field=models.CharField(
                choices=[
                    ("none", "Not started"),
                    ("preparing", "Preparing"),
                    ("out_for_delivery", "Out for delivery"),
                ],
                default="none",
                max_length=24,
            ),
        ),
    ]
