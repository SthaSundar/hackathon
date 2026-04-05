from django.db import migrations, models
import django.db.models.deletion


def migrate_payment_status(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    for b in Booking.objects.all():
        old = (b.payment_status or "").strip()
        if old in ("released", "held", "unpaid", "not_due", "refunded"):
            continue
        if old == "paid":
            b.payment_status = "released"
        elif old == "refunded":
            b.payment_status = "refunded"
        elif old in ("pending", "failed", ""):
            b.payment_status = "unpaid" if b.status == "completed" else "not_due"
        else:
            b.payment_status = "not_due"
        b.save(update_fields=["payment_status"])


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0006_booking_delivery_phase"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformRevenue",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("revenue_type", models.CharField(blank=True, max_length=40)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="platform_revenues",
                        to="bookings.booking",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddField(
            model_name="booking",
            name="esewa_ref_id",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="booking",
            name="esewa_transaction_uuid",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="booking",
            name="provider_payout_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Amount owed to provider after commission",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="total_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Total charged in NPR for this booking",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="transaction_type",
            field=models.CharField(
                choices=[("direct_purchase", "Direct purchase"), ("booking", "Booking")],
                default="booking",
                max_length=24,
            ),
        ),
        migrations.AlterField(
            model_name="booking",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("not_due", "Not due"),
                    ("unpaid", "Unpaid"),
                    ("held", "Held"),
                    ("released", "Released"),
                    ("refunded", "Refunded"),
                ],
                default="not_due",
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_payment_status, migrations.RunPython.noop),
    ]
