from datetime import datetime

from fastapi import APIRouter

from app.services.mongodb_service import get_database

router = APIRouter(tags=["Bhaktos"])


def _fmt_dt(val) -> str:
    if not val:
        return ""
    if isinstance(val, datetime):
        return val.strftime("%b %d, %Y %I:%M %p")
    return str(val)


@router.get("/overview")
async def get_bhaktos_overview():
    db = get_database()

    bookings = await db["bookings"].find({}).to_list(None)

    if not bookings:
        return {
            "stats": {"total_bhaktos": 0, "arrivals_only": 0, "departures_only": 0, "arrival_and_departure_both": 0},
            "records": [],
        }

    booking_ids = [b["_id"] for b in bookings]
    flight_docs = await db["flight_details"].find({"booking_id": {"$in": booking_ids}}).to_list(None)
    flight_map = {str(fd["booking_id"]): fd for fd in flight_docs}

    records = []
    for b in bookings:
        bid = str(b["_id"])
        fd = flight_map.get(bid, {})
        arrival = fd.get("arrival", {})
        departure = fd.get("departure", {})
        contact = b.get("contact", {})

        records.append({
            "id": bid,
            "first_name": contact.get("first_name", ""),
            "last_name": contact.get("last_name", ""),
            "email": contact.get("email", ""),
            "phone": contact.get("phone", ""),
            "mandal": contact.get("mandal", ""),
            "passengers_count": b.get("passengers_count", 0),
            "passengers": b.get("passengers", []),
            "bags_count": b.get("bags_count", 0),
            "stroller_required": b.get("stroller_required", False),
            "transportation_requirement": b.get("transportation_requirement", ""),
            "arrival_flight_name": arrival.get("flight_name", ""),
            "arrival_flight_number": arrival.get("flight_number", ""),
            "arrival_airport": arrival.get("airport", ""),
            "arrival_datetime": _fmt_dt(arrival.get("arrival_datetime")),
            "departure_flight_name": departure.get("flight_name", ""),
            "departure_flight_number": departure.get("flight_number", ""),
            "departure_airport": departure.get("airport", ""),
            "departure_datetime": _fmt_dt(departure.get("departure_datetime")),
        })

    total = len(records)
    arrivals_only = sum(1 for r in records if r["transportation_requirement"] == "Arrival Only")
    departures_only = sum(1 for r in records if r["transportation_requirement"] == "Departure Only")
    both = sum(1 for r in records if r["transportation_requirement"] == "Arrival and Departure Both")

    return {
        "stats": {
            "total_bhaktos": total,
            "arrivals_only": arrivals_only,
            "departures_only": departures_only,
            "arrival_and_departure_both": both,
        },
        "records": records,
    }
