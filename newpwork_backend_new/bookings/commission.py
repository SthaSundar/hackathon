"""Commission helpers for bookings / eSewa settlement."""

COMMISSION_RATE = 0.10
MINIMUM_COMMISSION_BOOKING = 200
FLAT_COMMISSION_DIRECT = 150
MAX_COMMISSION_PERCENT = 0.25


def calculate_commission(total_amount: int, transaction_type: str) -> dict:
    if total_amount < 0:
        raise ValueError("total_amount must be non-negative")
    if transaction_type == "direct_purchase":
        commission = FLAT_COMMISSION_DIRECT
    elif transaction_type == "booking":
        percentage_cut = int(total_amount * COMMISSION_RATE)
        commission = max(percentage_cut, MINIMUM_COMMISSION_BOOKING)
        commission = min(commission, int(total_amount * MAX_COMMISSION_PERCENT))
    else:
        raise ValueError(f"Unknown transaction_type: {transaction_type}")

    return {
        "total_amount": total_amount,
        "commission": commission,
        "provider_payout": total_amount - commission,
        "transaction_type": transaction_type,
    }


def get_transaction_type(service_category_slug: str | None, amount: int) -> str:
    slug = (service_category_slug or "").strip()
    if slug == "flower_vendor" and amount < 2000:
        return "direct_purchase"
    return "booking"
