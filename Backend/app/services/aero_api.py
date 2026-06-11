import logging
import re
from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_BASE = "https://aeroapi.flightaware.com/aeroapi"


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _add_minutes(time_str: str, minutes: int) -> str:
    """Offset a HH:MM string by ±minutes, wrapping at midnight."""
    try:
        h, m = map(int, time_str.split(":"))
        total = (h * 60 + m + minutes) % (24 * 60)
        if total < 0:
            total += 24 * 60
        return f"{total // 60:02d}:{total % 60:02d}"
    except Exception:
        return time_str


def _map_status(status_raw: str, delay_minutes: int) -> str:
    s = status_raw.lower()
    if "cancel" in s or "diverted" in s:
        return "cancelled"
    if "arrived" in s or "landed" in s:
        return "landed"
    if "departed" in s:
        return "departed"
    if "late" in s or "delay" in s or delay_minutes > 10:
        return "delayed"
    if delay_minutes <= -5:
        return "early"
    return "on_time"


def _enrich_from_flight(flight: dict, flight_type: str, scheduled_time: str) -> dict:
    if flight_type == "arrival":
        sched_dt  = _parse_dt(flight.get("scheduled_in"))
        actual_dt = _parse_dt(flight.get("actual_in")) or _parse_dt(flight.get("estimated_in"))
        terminal  = flight.get("gate_destination") or flight.get("terminal_destination") or ""
    else:
        sched_dt  = _parse_dt(flight.get("scheduled_out"))
        actual_dt = _parse_dt(flight.get("actual_out")) or _parse_dt(flight.get("estimated_out"))
        terminal  = flight.get("gate_origin") or flight.get("terminal_origin") or ""

    delay_minutes = 0
    if sched_dt and actual_dt:
        delay_minutes = int((actual_dt - sched_dt).total_seconds() / 60)

    status_raw = flight.get("status") or ""
    status = _map_status(status_raw, delay_minutes)

    actual_time = _add_minutes(scheduled_time, delay_minutes) if scheduled_time else ""

    return {
        "status":       status,
        "actualTime":   actual_time,
        "terminal":     str(terminal),
        "delayMinutes": delay_minutes,
    }


async def get_flight_realtime(
    flight_number: str,
    date_str: str,
    flight_type: str,
    scheduled_time: str,
) -> dict | None:
    """
    Fetch real-time flight status from AeroAPI.
    Returns enrichment dict {status, actualTime, terminal, delayMinutes} or None.
    """
    if not settings.aero_api_key:
        return None

    ident = re.sub(r"\s+", "", flight_number).upper()
    if not ident:
        return None

    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None

    # AeroAPI only serves data within ~7 days of today; skip silently outside that window.
    today = datetime.now(timezone.utc).replace(tzinfo=None)
    if abs((date - today).days) > 7:
        return None

    end_date = date + timedelta(days=1)

    url = f"{_BASE}/flights/{ident}"
    params = {
        "start":     date.strftime("%Y-%m-%dT00:00:00Z"),
        "end":       end_date.strftime("%Y-%m-%dT23:59:59Z"),
        "max_pages": 1,
    }
    headers = {"x-apikey": settings.aero_api_key}

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code in (400, 404, 422):
                logger.info("AeroAPI: no data for %s on %s (HTTP %s)", ident, date_str, resp.status_code)
                return None
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.warning("AeroAPI timeout for %s", ident)
        return None
    except Exception as exc:
        logger.warning("AeroAPI error for %s: %s", ident, exc)
        return None

    flights = data.get("flights", [])
    if not flights:
        return None

    # Pick the flight whose scheduled time is closest to our date
    target = datetime(date.year, date.month, date.day, tzinfo=timezone.utc)
    best = min(
        flights,
        key=lambda f: abs(
            (_parse_dt(f.get("scheduled_in") or f.get("scheduled_out")) or target) - target
        ),
    )

    result = _enrich_from_flight(best, flight_type, scheduled_time)
    logger.info(
        "AeroAPI %s %s → status=%s delay=%+d min",
        ident, date_str, result["status"], result["delayMinutes"],
    )
    return result
