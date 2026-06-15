from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.services.mongodb_service import get_database

logger = logging.getLogger(__name__)

router = APIRouter()


class Contact(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=32)
    mandal: str = Field(..., min_length=1, max_length=120)


class Traveler(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(default="", max_length=80)
    phone: str = Field(default="", max_length=32)
    mandal: str = Field(default="", max_length=120)


class Flight(BaseModel):
    flight_name: str = Field(default="", max_length=120)
    other_flight_name: str = Field(default="", max_length=120)
    flight_number: str = Field(default="", max_length=40)
    airport: str = Field(default="", max_length=40)
    scheduled_at: Optional[datetime] = None


class IntakeSubmission(BaseModel):
    submission_id: Optional[str] = Field(default=None, max_length=120)
    contact: Contact
    transportation_requirement: str = Field(..., max_length=80)
    family_count: int = Field(..., ge=1, le=30)
    bags_count: int = Field(default=0, ge=0, le=50)
    stroller_required: bool = False
    travelers: list[Traveler] = Field(default_factory=list, max_length=10)
    arrival: Optional[Flight] = None
    departure: Optional[Flight] = None

    @field_validator("transportation_requirement")
    @classmethod
    def _norm_transport(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("transportation_requirement cannot be empty")
        return v.strip()


def _flight_doc(f: Optional[Flight], direction: str) -> dict:
    if not f:
        return {}
    out: dict = {}
    if f.flight_name:
        out["flight_name"] = f.flight_name
    if f.other_flight_name:
        out["other_flight_name"] = f.other_flight_name
    if f.flight_number:
        out["flight_number"] = f.flight_number
    if f.airport:
        out["airport"] = f.airport
    if f.scheduled_at:
        dt = f.scheduled_at if f.scheduled_at.tzinfo else f.scheduled_at.replace(tzinfo=timezone.utc)
        out[f"{direction}_datetime"] = dt
    return out


@router.post("/submit")
async def submit_intake(payload: IntakeSubmission):
    db = get_database()
    created_at = datetime.now(timezone.utc)

    if payload.submission_id:
        existing = await db.bookings.find_one({"submission_id": payload.submission_id})
        if existing:
            logger.info(f"Idempotent intake replay for submission_id={payload.submission_id}")
            return {"booking_id": str(existing["_id"]), "duplicate": True}

    contact_mandal = payload.contact.mandal
    passengers = [
        {
            "first_name": t.first_name,
            "last_name": t.last_name,
            "mandal": t.mandal or contact_mandal,
            **({"phone": t.phone} if t.phone else {}),
        }
        for t in payload.travelers
    ]
    if not passengers:
        passengers = [{
            "first_name": payload.contact.first_name,
            "last_name": payload.contact.last_name,
            "mandal": contact_mandal,
        }]

    booking_doc: dict = {
        "contact": payload.contact.model_dump(),
        "passengers_count": payload.family_count,
        "passengers": passengers,
        "stroller_required": payload.stroller_required,
        "bags_count": payload.bags_count,
        "transportation_requirement": payload.transportation_requirement,
        "source": "intake_form",
        "created_at": created_at,
    }
    if payload.submission_id:
        booking_doc["submission_id"] = payload.submission_id

    try:
        booking_result = await db.bookings.insert_one(booking_doc)
    except Exception as exc:
        logger.exception("Failed to insert booking")
        raise HTTPException(status_code=500, detail=f"Booking insert failed: {exc}")

    booking_id = booking_result.inserted_id

    flight_doc = {
        "booking_id": booking_id,
        "arrival": _flight_doc(payload.arrival, "arrival"),
        "departure": _flight_doc(payload.departure, "departure"),
        "created_at": created_at,
    }
    try:
        await db.flight_details.insert_one(flight_doc)
    except Exception as exc:
        logger.exception("Failed to insert flight_details, rolling back booking")
        await db.bookings.delete_one({"_id": booking_id})
        raise HTTPException(status_code=500, detail=f"Flight details insert failed: {exc}")

    logger.info(f"Intake submitted: booking_id={booking_id} email={payload.contact.email}")
    return {"booking_id": str(booking_id), "duplicate": False}
