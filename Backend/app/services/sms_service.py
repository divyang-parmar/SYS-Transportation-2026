import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_TWILIO_URL = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

DEFAULT_SARTHI_ASSIGNED_BODY = (
    "Dear {{passenger_name}}, your Sarthi {{sarthi_name}} will pick you up for flight "
    "{{flight_number}} on {{pickup_date}} at {{pickup_time}}.\n\n"
    "Vehicle: {{vehicle_make}} {{vehicle_name}} ({{vehicle_number}})\n"
    "Contact: {{sarthi_phone}}\n\n"
    "— Airport Transportation"
)


def render_template(body: str, variables: dict) -> str:
    """Replace {{key}} placeholders; unknown placeholders become empty string."""
    def _replace(match):
        key = match.group(1).strip()
        return str(variables.get(key, ""))
    return re.sub(r"\{\{(\w+)\}\}", _replace, body)


async def send_sms(to: str, body: str) -> bool:
    """Send an SMS via Twilio REST API. Returns True on success, False if skipped/failed."""
    sid   = settings.twilio_account_sid
    token = settings.twilio_auth_token
    from_ = settings.twilio_from_number

    if not (sid and token and from_):
        logger.warning("Twilio not configured — SMS skipped (to=%s)", to)
        return False

    # Normalise US numbers: 10-digit → +1XXXXXXXXXX
    cleaned = re.sub(r"[\s\-()]", "", to)
    if cleaned and not cleaned.startswith("+"):
        cleaned = "+1" + cleaned.lstrip("1")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                _TWILIO_URL.format(sid=sid),
                auth=(sid, token),
                data={"From": from_, "To": cleaned, "Body": body},
            )
            resp.raise_for_status()
        logger.info("SMS sent to %s", cleaned)
        return True
    except Exception as exc:
        logger.error("SMS failed to %s: %s", cleaned, exc)
        return False
