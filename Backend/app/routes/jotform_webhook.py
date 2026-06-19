import json
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Request

from app.config import settings
from app.services.mongodb_service import get_database
from app.services.validation_service import validate_form_id, validate_token

router = APIRouter(tags=["JotForm Webhook"])
logger = logging.getLogger(__name__)

# JotForm rawRequest uses q{qid}_{name} keys. These are derived from
# the form's question list (GET /form/231615575331049/questions).
#
# Personal / booking fields
F_NAME            = "q83_name"           # fullname → {"first":…,"last":…}
F_EMAIL           = "q5_email"
F_PHONE           = "q6_phoneNumber"     # phone → {"full":"(###)…"}
F_MANDAL          = "q73_mandal"
F_TRANSPORT       = "q86_pleaseSelect"
F_FAMILY_COUNT    = "q95_familyCount"
F_BAGS            = "q97_numberOf"
F_STROLLER        = "q98_strollerRequirement"

# Flight fields
F_ARR_FLIGHT_NAME = "q61_typeA61"
F_ARR_FLIGHT_NUM  = "q99_arrivalFlight99"
F_ARR_AIRPORT     = "q87_arrivalFlight87"
F_ARR_OTHER       = "q77_otherArrival"
F_ARR_DATETIME    = "q9_departingFlight9"    # named "Arrival Flight Date And Time"
F_DEP_FLIGHT_NAME = "q62_departureFlight"
F_DEP_FLIGHT_NUM  = "q100_departureFlight100"
F_DEP_AIRPORT     = "q88_departureFlight88"
F_DEP_OTHER       = "q78_otherDeparture"
F_DEP_DATETIME    = "q55_arrivalFlight55"    # named "Departure Flight Date And Time"

# Traveler 1–10: (first_name_key, last_name_key, phone_key, mandal_key)
TRAVELER_GROUPS = [
    ("q107_firstName",          "q108_lastName",    "q111_phoneNumber111", "q110_mandal110"),  # T1
    ("q113_Traveler2FirstName",  "q114_lastName114", "q115_phoneNumber115", "q156_mandal156"),  # T2
    ("q119_firstName119",        "q120_lastName120", "q121_phoneNumber121", "q157_mandal157"),  # T3
    ("q124_firstName124",        "q125_lastName125", "q126_phoneNumber126", "q127_mandal127"),  # T4
    ("q129_firstName129",        "q130_lastName130", "q131_phoneNumber131", "q132_mandal132"),  # T5
    ("q134_firstName134",        "q135_lastName135", "q136_phoneNumber136", "q158_mandal158"),  # T6
    ("q138_firstName138",        "q139_lastName139", "q140_phoneNumber140", "q159_mandal159"),  # T7
    ("q142_firstName142",        "q143_lastName143", "q144_phoneNumber144", "q160_mandal160"),  # T8
    ("q147_firstName147",        "q148_lastName148", "q149_phoneNumber149", "q150_mandal150"),  # T9
    ("q152_firstName152",        "q153_lastName153", "q154_phoneNumber154", "q155_mandal155"),  # T10
]


def _str(val: Any) -> str:
    """Return a plain string from a JotForm answer (handles dict sub-fields)."""
    if isinstance(val, dict):
        return " ".join(str(v) for v in val.values() if v).strip()
    return str(val).strip() if val else ""


def _int(val: Any, default: int = 0) -> int:
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def _parse_jotform_datetime(val: Any) -> datetime | None:
    """Parse JotForm datetime dict → datetime.
    Real format: {"month":"07","day":"29","year":"2026","hour":"12","min":"34","ampm":"PM","datetime":"2026-07-29 12:34:00"}
    """
    if not isinstance(val, dict):
        return None
    try:
        if val.get("datetime"):
            return datetime.strptime(val["datetime"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        month  = int(val.get("month") or 1)
        day    = int(val.get("day")   or 1)
        year   = int(val.get("year")  or 2000)
        hour   = int(val.get("hour")  or 0)
        minute = int(val.get("min")   or 0)
        ampm   = (val.get("ampm") or "AM").upper()
        if ampm == "PM" and hour != 12:
            hour += 12
        elif ampm == "AM" and hour == 12:
            hour = 0
        return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)
    except Exception:
        return None


def _build_passengers(fields: dict) -> list[dict]:
    passengers: list[dict] = []
    for first_key, last_key, phone_key, mandal_key in TRAVELER_GROUPS:
        first = _str(fields.get(first_key, ""))
        last  = _str(fields.get(last_key, ""))
        if not first and not last:
            continue
        passenger: dict = {"first_name": first, "last_name": last}
        phone = _str(fields.get(phone_key, ""))
        if phone:
            passenger["phone"] = phone
        if mandal_key:
            passenger["mandal"] = _str(fields.get(mandal_key, ""))
        passengers.append(passenger)
    return passengers


def _extract_phone(val: Any) -> str:
    """JotForm phone fields send {"full": "(###) ###-####"}."""
    if isinstance(val, dict):
        return _str(val.get("full") or val.get("phone") or val)
    return _str(val)


def _build_booking_doc(fields: dict, created_at: datetime) -> dict:
    name_val = fields.get(F_NAME, {})
    if isinstance(name_val, dict):
        first_name = _str(name_val.get("first", ""))
        last_name  = _str(name_val.get("last", ""))
    else:
        parts = _str(name_val).split(" ", 1)
        first_name = parts[0]
        last_name  = parts[1] if len(parts) > 1 else ""

    stroller_raw = fields.get(F_STROLLER, "")
    if isinstance(stroller_raw, list):
        stroller_required = len(stroller_raw) > 0 and stroller_raw[0] not in ("", "No", "false")
    else:
        stroller_required = _str(stroller_raw).lower() not in ("", "no", "false", "0", "none")

    passengers = _build_passengers(fields)
    if not passengers:
        passengers = [{"first_name": first_name, "last_name": last_name, "mandal": _str(fields.get(F_MANDAL, ""))}]

    doc: dict = {
        "contact": {
            "first_name": first_name,
            "last_name":  last_name,
            "phone":      _extract_phone(fields.get(F_PHONE, "")),
            "email":      _str(fields.get(F_EMAIL, "")),
            "mandal":     _str(fields.get(F_MANDAL, "")),
        },
        "passengers_count": _int(fields.get(F_FAMILY_COUNT), default=len(passengers)),
        "passengers":       passengers,
        "stroller_required": stroller_required,
        "created_at":       created_at,
    }

    bags = fields.get(F_BAGS)
    if bags is not None:
        doc["bags_count"] = _int(bags)

    transport = _str(fields.get(F_TRANSPORT, ""))
    if transport:
        doc["transportation_requirement"] = transport

    return doc


def _build_flight_doc(fields: dict, booking_id: ObjectId, created_at: datetime) -> dict:
    arrival: dict = {}
    if v := _str(fields.get(F_ARR_FLIGHT_NAME, "")):
        arrival["flight_name"] = v
    if v := _str(fields.get(F_ARR_OTHER, "")):
        arrival["other_flight_name"] = v
    if v := _str(fields.get(F_ARR_FLIGHT_NUM, "")):
        arrival["flight_number"] = v
    if v := _str(fields.get(F_ARR_AIRPORT, "")):
        arrival["airport"] = v
    if dt := _parse_jotform_datetime(fields.get(F_ARR_DATETIME)):
        arrival["arrival_datetime"] = dt

    departure: dict = {}
    if v := _str(fields.get(F_DEP_FLIGHT_NAME, "")):
        departure["flight_name"] = v
    if v := _str(fields.get(F_DEP_OTHER, "")):
        departure["other_flight_name"] = v
    if v := _str(fields.get(F_DEP_FLIGHT_NUM, "")):
        departure["flight_number"] = v
    if v := _str(fields.get(F_DEP_AIRPORT, "")):
        departure["airport"] = v
    if dt := _parse_jotform_datetime(fields.get(F_DEP_DATETIME)):
        departure["departure_datetime"] = dt

    return {
        "booking_id": booking_id,
        "arrival":    arrival,
        "departure":  departure,
        "created_at": created_at,
    }


@router.post("/webhook")
async def jotform_webhook(
    request: Request,
    token: str | None = Query(default=None),
):
    if not validate_token(token):
        raise HTTPException(status_code=403, detail="Invalid or missing token")

    form_data = await request.form()
    form_id = form_data.get("formID", "")

    if not validate_form_id(form_id):
        logger.warning(f"Rejected webhook for unexpected formID: {form_id}")
        raise HTTPException(status_code=400, detail="Unexpected form ID")

    submission_id = form_data.get("submissionID", "")
    raw_request_json = form_data.get("rawRequest", "{}")

    try:
        fields = json.loads(raw_request_json)
    except json.JSONDecodeError:
        logger.warning(f"Could not parse rawRequest JSON for submission {submission_id}")
        fields = {}

    # Log raw keys so key-format issues can be diagnosed from server logs.
    logger.info(f"RAW FIELDS for {submission_id}: {json.dumps(fields, default=str)}")

    created_at = datetime.now(timezone.utc)
    db = get_database()

    # Insert booking first — flight_details.booking_id references its _id.
    booking_doc = _build_booking_doc(fields, created_at)
    booking_result = await db[settings.bookings_collection].insert_one(booking_doc)
    booking_id: ObjectId = booking_result.inserted_id

    flight_doc = _build_flight_doc(fields, booking_id, created_at)
    flight_result = await db[settings.flight_details_collection].insert_one(flight_doc)

    logger.info(
        f"Submission {submission_id} → "
        f"bookings._id={booking_id}  flight_details._id={flight_result.inserted_id}"
    )

    return {"status": "ok", "submissionID": submission_id}
