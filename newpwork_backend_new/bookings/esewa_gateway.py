"""
eSewa payment helpers.

Set ESEWA_MOCK=false (and configure ESEWA_BASE_URL / secret) to use the real eSewa v2 API.
Default ESEWA_MOCK=true uses a local mock checkout page — no external eSewa dependency.
"""

import base64
import hashlib
import hmac
import json
import os
import uuid

import requests

ESEWA_MERCHANT_CODE = os.getenv("ESEWA_MERCHANT_CODE", "EPAYTEST")
ESEWA_BASE_URL = os.getenv("ESEWA_BASE_URL", "https://rc-epay.esewa.com.np").rstrip("/")
ESEWA_SECRET_KEY = os.getenv("ESEWA_SECRET_KEY", "8gBm/:&EnhH.1/q")

# Default true so local dev works when eSewa is unreachable
USE_MOCK = os.getenv("ESEWA_MOCK", "true").lower() in ("1", "true", "yes")


def is_mock_mode() -> bool:
    return USE_MOCK


def refund_payment(pidx: str) -> dict:
    """Stub for future eSewa refund integration."""
    if USE_MOCK:
        return {"status": "Refunded"}
    return {"status": "not_implemented", "pidx": pidx}


def _generate_signature(message: str) -> str:
    key = ESEWA_SECRET_KEY.encode("utf-8")
    msg = message.encode("utf-8")
    hmac_digest = hmac.new(key, msg, hashlib.sha256).digest()
    return base64.b64encode(hmac_digest).decode("utf-8")


def create_payment_payload(
    booking_id: int,
    amount_npr: int,
    success_url: str,
    failure_url: str,
) -> dict:
    transaction_uuid = str(uuid.uuid4())
    if USE_MOCK:
        return {
            "amount": str(amount_npr),
            "tax_amount": "0",
            "total_amount": str(amount_npr),
            "transaction_uuid": transaction_uuid,
            "product_code": ESEWA_MERCHANT_CODE,
            "product_service_charge": "0",
            "product_delivery_charge": "0",
            "success_url": success_url,
            "failure_url": failure_url,
            "signed_field_names": "total_amount,transaction_uuid,product_code",
            "signature": "mock_signature",
            "esewa_url": "/mock-payment",
            "booking_id": booking_id,
        }

    message = (
        f"total_amount={amount_npr},"
        f"transaction_uuid={transaction_uuid},"
        f"product_code={ESEWA_MERCHANT_CODE}"
    )
    signature = _generate_signature(message)
    return {
        "amount": str(amount_npr),
        "tax_amount": "0",
        "total_amount": str(amount_npr),
        "transaction_uuid": transaction_uuid,
        "product_code": ESEWA_MERCHANT_CODE,
        "product_service_charge": "0",
        "product_delivery_charge": "0",
        "success_url": success_url,
        "failure_url": failure_url,
        "signed_field_names": "total_amount,transaction_uuid,product_code",
        "signature": signature,
        "esewa_url": f"{ESEWA_BASE_URL}/api/epay/main/v2/form",
        "booking_id": booking_id,
    }


def verify_payment(encoded_data):
    """
    Real mode: encoded_data is base64 JSON from eSewa redirect.
    Mock mode: encoded_data is base64 JSON with transaction_uuid + total_amount,
    or a dict (tests) with those keys.
    """
    if USE_MOCK:
        total = "0"
        txn_uuid = "mock-uuid"
        if isinstance(encoded_data, dict):
            total = str(encoded_data.get("total_amount", "0"))
            txn_uuid = str(encoded_data.get("transaction_uuid") or txn_uuid)
        elif isinstance(encoded_data, str) and encoded_data:
            try:
                obj = json.loads(base64.b64decode(encoded_data).decode("utf-8"))
                total = str(obj.get("total_amount", "0"))
                txn_uuid = str(obj.get("transaction_uuid") or txn_uuid)
            except Exception:
                pass
        return {
            "transaction_uuid": txn_uuid,
            "transaction_code": "MOCK-TXN-001",
            "total_amount": total,
            "status": "COMPLETE",
        }

    decoded = base64.b64decode(encoded_data).decode("utf-8")
    transaction_data = json.loads(decoded)

    signed_fields = transaction_data.get("signed_field_names", "").split(",")
    message = ",".join(f"{field}={transaction_data.get(field, '')}" for field in signed_fields if field)
    expected_signature = _generate_signature(message)
    received_signature = transaction_data.get("signature", "")

    if expected_signature != received_signature:
        raise ValueError("Signature mismatch — payment data may be tampered")

    verification_url = (
        f"{ESEWA_BASE_URL}/api/epay/transaction/status/"
        f"?product_code={ESEWA_MERCHANT_CODE}"
        f"&transaction_uuid={transaction_data['transaction_uuid']}"
        f"&total_amount={transaction_data['total_amount']}"
    )
    response = requests.get(verification_url, timeout=15)
    response.raise_for_status()
    server_data = response.json()

    if server_data.get("status") != "COMPLETE":
        raise ValueError(f"eSewa server says payment not complete: {server_data.get('status')}")

    return {
        "transaction_uuid": transaction_data["transaction_uuid"],
        "transaction_code": transaction_data.get("transaction_code", ""),
        "total_amount": transaction_data["total_amount"],
        "status": server_data["status"],
    }
