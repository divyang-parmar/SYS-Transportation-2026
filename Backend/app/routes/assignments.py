import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services.mongodb_service import get_database
from app.services.sms_service import DEFAULT_SARTHI_ASSIGNED_BODY, render_template, send_sms
from app.services.email_service import (
    DEFAULT_SARTHI_ASSIGNED_EMAIL_SUBJECT,
    DEFAULT_SARTHI_ASSIGNED_EMAIL_BODY,
    send_assignment_email,
)

router = APIRouter(tags=["Assignments"])
logger = logging.getLogger(__name__)


def _date_str(dt) -> str:
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return ""


def _time_str(dt) -> str:
    if isinstance(dt, datetime):
        return dt.strftime("%H:%M")
    return ""


def _oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail=f"Invalid ObjectId: {s}")


class AssignmentUpsert(BaseModel):
    sarthi_id: str
    flight_group_id: str


@router.get("/")
async def list_assignments():
    """Return all current assignments (bookingId → sarthiId mapping per flight type)."""
    db = get_database()
    docs = await db[settings.assignments_collection].find({}).to_list(None)
    return [
        {
            "bookingId":     str(d["booking_id"]),
            "sarthiId":      str(d["sarthi_id"]),
            "flightType":    d.get("flight_type", ""),
            "flightGroupId": d.get("flight_group_id", ""),
        }
        for d in docs
    ]


@router.get("/sarthi/{sarthi_id}")
async def get_sarthi_pickups(sarthi_id: str):
    """Return the full pickup list for a sarthi with passenger and flight details."""
    db = get_database()

    try:
        sarthi_oid = ObjectId(sarthi_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="Invalid sarthi_id")

    assignments = await db[settings.assignments_collection].find(
        {"sarthi_id": sarthi_oid}
    ).to_list(None)

    if not assignments:
        return []

    # booking_id is stored as ObjectId in the collection
    oid_list = []
    for a in assignments:
        raw = a["booking_id"]
        if isinstance(raw, ObjectId):
            oid_list.append(raw)
        else:
            try:
                oid_list.append(ObjectId(str(raw)))
            except (InvalidId, Exception):
                pass

    bookings = await db[settings.bookings_collection].find(
        {"_id": {"$in": oid_list}}
    ).to_list(None)
    booking_map = {str(b["_id"]): b for b in bookings}

    flight_docs = await db[settings.flight_details_collection].find(
        {"booking_id": {"$in": oid_list}}
    ).to_list(None)
    flight_map = {str(fd["booking_id"]): fd for fd in flight_docs}

    result = []
    for a in assignments:
        bid = str(a["booking_id"])
        booking = booking_map.get(bid, {})
        fd = flight_map.get(bid, {})
        flight_type = a.get("flight_type", "arrival")
        section = fd.get(flight_type, {})

        dt_val = section.get(f"{flight_type}_datetime")
        contact = booking.get("contact", {})
        name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip() or "Unknown"

        result.append({
            "bookingId":      bid,
            "flightType":     flight_type,
            "flightGroupId":  a.get("flight_group_id", ""),
            "name":           name,
            "phone":          contact.get("phone", ""),
            "mandal":         contact.get("mandal", ""),
            "passengerCount": booking.get("passengers_count", 1),
            "strollerRequired": bool(booking.get("stroller_required", False)),
            "flightNumber":   (section.get("flight_number") or section.get("flight_name") or "").strip(),
            "airline":        (section.get("flight_name") or "").strip(),
            "scheduledTime":  _time_str(dt_val),
            "date":           _date_str(dt_val),
        })

    result.sort(key=lambda r: (r["date"], r["scheduledTime"]))
    return result


async def _send_assignment_sms(
    booking_oid: ObjectId,
    sarthi_oid: ObjectId,
    flight_type: str,
) -> None:
    """Fetch all needed data and fire the sms-sarthi-assigned SMS. Never raises."""
    try:
        db = get_database()

        booking, sarthi_doc, template_doc, vehicle_doc, email_template_doc = await asyncio.gather(
            db[settings.bookings_collection].find_one({"_id": booking_oid}),
            db[settings.sarthi_collection].find_one({"_id": sarthi_oid}),
            db[settings.templates_collection].find_one({"_id": "sms-sarthi-assigned"}),
            db[settings.vehicles_collection].find_one({"assigned_driver_id": sarthi_oid}),
            db[settings.templates_collection].find_one({"_id": "email-sarthi-assigned"}),
        )

        if not booking:
            logger.warning("SMS skipped: booking %s not found", booking_oid)
            return

        flight_doc = await db[settings.flight_details_collection].find_one(
            {"booking_id": booking_oid}
        )

        contact      = booking.get("contact", {})
        passenger_name = (
            f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
            or "Passenger"
        )
        passenger_phone = contact.get("phone", "")
        passenger_email = contact.get("email", "")

        if not passenger_phone and not passenger_email:
            logger.warning("SMS/email skipped: no phone or email for booking %s", booking_oid)
            return

        sarthi_name  = (sarthi_doc or {}).get("full_name", "")
        sarthi_phone = (sarthi_doc or {}).get("phone", "")

        vehicle_make   = (vehicle_doc or {}).get("make", "")
        vehicle_name   = (vehicle_doc or {}).get("vehicle_name", "")
        vehicle_number = (vehicle_doc or {}).get("number_plate", "")

        section  = (flight_doc or {}).get(flight_type, {})
        dt_val   = section.get(f"{flight_type}_datetime")
        flight_number = (
            section.get("flight_number") or section.get("flight_name") or ""
        ).strip()
        pickup_date = dt_val.strftime("%a, %-d %b %Y") if isinstance(dt_val, datetime) else ""
        pickup_time = dt_val.strftime("%H:%M")          if isinstance(dt_val, datetime) else ""

        template_body = (
            template_doc.get("body", DEFAULT_SARTHI_ASSIGNED_BODY)
            if template_doc
            else DEFAULT_SARTHI_ASSIGNED_BODY
        )

        variables = {
            "passenger_name": passenger_name,
            "sarthi_name":    sarthi_name,
            "sarthi_phone":   sarthi_phone,
            "flight_number":  flight_number,
            "pickup_date":    pickup_date,
            "pickup_time":    pickup_time,
            "vehicle_make":   vehicle_make,
            "vehicle_name":   vehicle_name,
            "vehicle_number": vehicle_number,
        }

        message = render_template(template_body, variables)

        # Try SMS if phone is available
        sms_ok = False
        if passenger_phone:
            sms_ok = await send_sms(passenger_phone, message)

        # Email fallback if SMS failed or no phone
        if not sms_ok and passenger_email:
            email_tmpl = email_template_doc or {}
            email_subject_tpl = email_tmpl.get("subject") or DEFAULT_SARTHI_ASSIGNED_EMAIL_SUBJECT
            email_body_tpl    = email_tmpl.get("body")    or DEFAULT_SARTHI_ASSIGNED_EMAIL_BODY
            email_subject = render_template(email_subject_tpl, variables)
            email_body    = render_template(email_body_tpl, variables)
            await send_assignment_email(passenger_email, passenger_name, email_subject, email_body, variables)

    except Exception as exc:
        logger.error("SMS send failed for booking %s: %s", booking_oid, exc)


@router.put("/{booking_id}/{flight_type}", status_code=200)
async def upsert_assignment(booking_id: str, flight_type: str, body: AssignmentUpsert):
    """Assign (or re-assign) a sarthi to a booking for a specific flight direction."""
    if flight_type not in ("arrival", "departure"):
        raise HTTPException(status_code=400, detail="flight_type must be 'arrival' or 'departure'")

    booking_oid = _oid(booking_id)
    sarthi_oid  = _oid(body.sarthi_id)

    now = datetime.now(timezone.utc)
    db = get_database()
    await db[settings.assignments_collection].update_one(
        {"booking_id": booking_oid, "flight_type": flight_type},
        {
            "$set": {
                "sarthi_id":       sarthi_oid,
                "flight_group_id": body.flight_group_id,
                "updated_at":      now,
            },
            "$setOnInsert": {
                "assigned_at": now,
                "trip_status": "pending",
            },
        },
        upsert=True,
    )
    logger.info("Assignment: booking=%s sarthi=%s type=%s", booking_id, body.sarthi_id, flight_type)

    # Fire SMS without blocking the response
    asyncio.create_task(_send_assignment_sms(booking_oid, sarthi_oid, flight_type))

    return {"bookingId": booking_id, "sarthiId": body.sarthi_id, "flightType": flight_type}


@router.delete("/{booking_id}/{flight_type}", status_code=204)
async def remove_assignment(booking_id: str, flight_type: str):
    """Remove the sarthi assignment for a booking (idempotent)."""
    db = get_database()
    booking_oid = _oid(booking_id)
    await db[settings.assignments_collection].delete_one(
        {"booking_id": booking_oid, "flight_type": flight_type}
    )
