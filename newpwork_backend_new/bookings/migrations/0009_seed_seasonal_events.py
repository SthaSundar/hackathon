from django.db import migrations
from datetime import date


def seed_events(apps, schema_editor):
    SeasonalEvent = apps.get_model("bookings", "SeasonalEvent")
    seed = [
        ("Tihar 2026", date(2026, 10, 20), date(2026, 10, 25)),
        ("Dashain 2026", date(2026, 10, 5), date(2026, 10, 15)),
        ("Wedding Season", date(2026, 2, 1), date(2026, 5, 31)),
        ("Valentines Day", date(2026, 2, 14), date(2026, 2, 14)),
    ]
    for name, start, end in seed:
        SeasonalEvent.objects.get_or_create(
            name=name,
            defaults={"start_date": start, "end_date": end, "is_active": True},
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0008_seasonalevent_booking_is_prebooking_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_events, noop),
    ]
