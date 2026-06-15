import json
import logging
from decimal import Decimal, ROUND_HALF_UP
from urllib import error, parse, request

from django.conf import settings

logger = logging.getLogger(__name__)
MOLLIE_API_BASE_URL = "https://api.mollie.com/v2"


class MolliePaymentError(RuntimeError):
    pass


def calculate_booking_amount(booking) -> Decimal:
    activity_price = getattr(booking.timeslot.activity, "price", Decimal("0.00")) or Decimal("0.00")
    total = (Decimal(activity_price) * Decimal(booking.participants)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return total


def _require_mollie_api_key() -> str:
    api_key = getattr(settings, "MOLLIE_API_KEY", "")
    if not api_key:
        raise MolliePaymentError("Mollie API key ontbreekt. Stel MOLLIE_API_KEY in.")
    return api_key


def _public_base_url(value: str, fallback: str) -> str:
    return (value or fallback).rstrip("/")


def build_booking_return_url(public_reference) -> str:
    frontend_base_url = _public_base_url(getattr(settings, "FRONTEND_PUBLIC_URL", ""), "http://localhost:5173")
    return f"{frontend_base_url}/bookings/payment-return?ref={public_reference}"


def build_booking_webhook_url() -> str:
    backend_base_url = _public_base_url(getattr(settings, "BACKEND_PUBLIC_URL", ""), "http://localhost:8000")
    return f"{backend_base_url}/api/payments/mollie/webhook/"


def _mollie_request(method: str, path: str, payload: dict | None = None) -> dict:
    api_key = _require_mollie_api_key()
    url = f"{MOLLIE_API_BASE_URL}{path}"
    body = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }

    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")

    req = request.Request(url, data=body, method=method.upper(), headers=headers)

    try:
        with request.urlopen(req, timeout=20) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body) if response_body else {}
    except error.HTTPError as exc:
        error_body = exc.read().decode("utf-8") if exc.fp else ""
        raise MolliePaymentError(error_body or f"Mollie request failed with status {exc.code}") from exc
    except error.URLError as exc:
        raise MolliePaymentError(str(exc.reason)) from exc


def create_mollie_checkout(booking, public_reference) -> dict:
    amount = calculate_booking_amount(booking)
    if amount <= 0:
        raise MolliePaymentError("Het bedrag voor deze activiteit is ongeldig of ontbreekt.")

    payload = {
        "amount": {
            "currency": "EUR",
            "value": f"{amount:.2f}",
        },
        "description": f"{booking.timeslot.activity.name} - {booking.timeslot.starts_at.strftime('%d-%m-%Y %H:%M')}",
        "method": "ideal",
        "redirectUrl": build_booking_return_url(public_reference),
        "webhookUrl": build_booking_webhook_url(),
        "metadata": {
            "booking_id": booking.id,
            "public_reference": str(public_reference),
        },
    }

    response = _mollie_request("POST", "/payments", payload)
    checkout_url = response.get("_links", {}).get("checkout", {}).get("href")
    if not response.get("id") or not checkout_url:
        raise MolliePaymentError("Mollie checkout kon niet worden aangemaakt.")

    return {
        "payment_id": response["id"],
        "checkout_url": checkout_url,
        "status": response.get("status", "open"),
        "amount": amount,
    }


def get_mollie_payment(payment_id: str) -> dict:
    if not payment_id:
        raise MolliePaymentError("Ontbrekende Mollie payment id.")
    return _mollie_request("GET", f"/payments/{parse.quote(payment_id)}")


def log_mollie_status(payment_id: str, payload: dict):
    logger.info("Mollie payment status fetched", extra={"payment_id": payment_id, "status": payload.get("status")})
