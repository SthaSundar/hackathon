"""Rolling average of hours from booking creation to provider's first chat reply."""


def format_response_time_label(hours: float | None) -> str | None:
    if hours is None:
        return None
    if hours < 1:
        return "Replies within 1 hour"
    if hours < 4:
        return f"Replies within {int(hours)} hours"
    if hours < 24:
        return "Replies same day"
    return "Replies within 2 days"


def update_provider_avg_response_hours(provider, booking_created_at, now):
    """Update provider.avg_response_hours using a rolling mean."""
    from django.utils import timezone

    if booking_created_at is None:
        return
    if timezone.is_naive(booking_created_at):
        booking_created_at = timezone.make_aware(
            booking_created_at, timezone.get_current_timezone()
        )
    hours_taken = (now - booking_created_at).total_seconds() / 3600.0
    count = provider.total_response_count or 0
    current_avg = provider.avg_response_hours
    if current_avg is None:
        new_avg = hours_taken
    else:
        new_avg = ((current_avg * count) + hours_taken) / (count + 1)
    provider.avg_response_hours = round(new_avg, 1)
    provider.total_response_count = count + 1
    provider.save(update_fields=["avg_response_hours", "total_response_count"])
