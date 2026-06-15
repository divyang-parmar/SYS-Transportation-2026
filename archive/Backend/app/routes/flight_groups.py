import asyncio
import logging
import re
from datetime import datetime

from fastapi import APIRouter

from app.config import settings
from app.services.aero_api import get_flight_realtime
from app.services.mongodb_service import get_database

router = APIRouter(tags=["FlightGroups"])
logger = logging.getLogger(__name__)


def _date_str(dt) -> str:
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return ""


def _time_str(dt) -> str:
    if isinstance(dt, datetime):
        return dt.strftime("%H:%M")
    return ""


def _group_id(flight_type: str, flight_key: str, date_str: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9]", "", flight_key)
    safe_date = date_str.replace("-", "") or "nodate"
    return f"{flight_type}_{safe}_{safe_date}"


def _build_groups(bookings: list, flight_map: dict, flight_type: str) -> tuple[list, list]:
    """Group bookings by (flight_number, date) for the given flight_type.

    flight_type: "arrival" | "departure"
    Returns (groups_list, passengers_list).
    """
    groups: dict[str, dict] = {}
    passengers: list[dict] = []

    for booking in bookings:
        bid = str(booking["_id"])
        fd = flight_map.get(bid, {})
        section = fd.get(flight_type, {})

        flight_num  = (section.get("flight_number") or "").strip()
        flight_name = (section.get("flight_name")   or "").strip()

        if not flight_num and not flight_name:
            continue

        dt_key    = f"{flight_type}_datetime"
        dt_val    = section.get(dt_key)
        date_str  = _date_str(dt_val)
        time_str  = _time_str(dt_val)
        flight_key = flight_num or flight_name
        gid = _group_id(flight_type, flight_key, date_str)

        if gid not in groups:
            airport = (section.get("airport") or "").strip()
            groups[gid] = {
                "id":            gid,
                "flightNumber":  flight_num or flight_name,
                "airline":       flight_name or flight_num,
                "scheduledTime": time_str,
                "actualTime":    time_str,
                "date":          date_str,
                "terminal":      "",
                "type":          flight_type,
                "status":        "on_time",
                "origin":        airport if flight_type == "arrival"   else None,
                "destination":   airport if flight_type == "departure" else None,
                "passengerIds":  [],
            }

        groups[gid]["passengerIds"].append(bid)

        contact = booking.get("contact", {})
        full_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip() or "Unknown"
        passengers.append({
            "id":                 bid,
            "name":               full_name,
            "phone":              contact.get("phone", ""),
            "mandal":             contact.get("mandal", ""),
            "passengerCount":     booking.get("passengers_count", 1),
            "destination":        "",
            "wheelchairRequired": bool(booking.get("stroller_required", False)),
            "carSeatRequired":    False,
            "flightGroup":        gid,
        })

    return list(groups.values()), passengers


async def _load_data():
    db = get_database()
    bookings = await db[settings.bookings_collection].find({}).to_list(None)
    if not bookings:
        return [], {}
    booking_ids = [b["_id"] for b in bookings]
    flight_docs = await db[settings.flight_details_collection].find(
        {"booking_id": {"$in": booking_ids}}
    ).to_list(None)
    flight_map = {str(fd["booking_id"]): fd for fd in flight_docs}
    return bookings, flight_map


async def _enrich_with_realtime(groups: list, flight_type: str) -> None:
    """Fetch AeroAPI status for each unique (flightNumber, date) and update groups in-place."""
    if not groups:
        return
    enrichments = await asyncio.gather(
        *[
            get_flight_realtime(g["flightNumber"], g["date"], flight_type, g["scheduledTime"])
            for g in groups
        ],
        return_exceptions=True,
    )
    for g, result in zip(groups, enrichments):
        if not isinstance(result, dict):
            continue
        g["status"] = result["status"]
        if result["actualTime"]:
            g["actualTime"] = result["actualTime"]
        if result["terminal"]:
            g["terminal"] = result["terminal"]


@router.get("/arrivals")
async def get_arrival_groups():
    bookings, flight_map = await _load_data()
    if not bookings:
        return {"groups": [], "passengers": []}
    groups, passengers = _build_groups(bookings, flight_map, "arrival")
    groups.sort(key=lambda g: (g["date"], g["scheduledTime"]))
    await _enrich_with_realtime(groups, "arrival")
    return {"groups": groups, "passengers": passengers}


@router.get("/departures")
async def get_departure_groups():
    bookings, flight_map = await _load_data()
    if not bookings:
        return {"groups": [], "passengers": []}
    groups, passengers = _build_groups(bookings, flight_map, "departure")
    groups.sort(key=lambda g: (g["date"], g["scheduledTime"]))
    await _enrich_with_realtime(groups, "departure")
    return {"groups": groups, "passengers": passengers}
