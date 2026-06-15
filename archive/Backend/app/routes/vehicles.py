from __future__ import annotations

import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services.mongodb_service import get_database

router = APIRouter(tags=["Vehicles"])
logger = logging.getLogger(__name__)

VEHICLE_TYPES = {"SUV", "MUV", "Van", "Tempo Traveller", "Bus", "Sedan"}


def _serialise(doc: dict) -> dict:
    return {
        "id":               str(doc["_id"]),
        "make":             doc.get("make", ""),
        "name":             doc.get("vehicle_name", ""),
        "vehicleNumber":    doc.get("number_plate", ""),
        "type":             doc.get("vehicle_type", "MUV"),
        "capacity":         doc.get("capacity", 7),
        "assignedDriverId": doc.get("assigned_driver_id"),
    }


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid vehicle id")


class VehicleCreate(BaseModel):
    make: str
    name: str
    vehicleNumber: str
    type: str = "MUV"
    capacity: int = 7


class VehicleUpdate(BaseModel):
    make: str | None = None
    name: str | None = None
    vehicleNumber: str | None = None
    type: str | None = None
    capacity: int | None = None
    assignedDriverId: str | None = None


@router.get("/")
async def list_vehicles():
    db = get_database()
    docs = await db[settings.vehicles_collection].find({}).to_list(None)
    return [_serialise(d) for d in docs]


@router.post("/", status_code=201)
async def create_vehicle(body: VehicleCreate):
    if body.type not in VEHICLE_TYPES:
        raise HTTPException(status_code=422, detail=f"type must be one of {sorted(VEHICLE_TYPES)}")
    now = datetime.now(timezone.utc)
    doc = {
        "make":               body.make.strip(),
        "vehicle_name":       body.name.strip(),
        "number_plate":       body.vehicleNumber.strip(),
        "vehicle_type":       body.type,
        "capacity":           body.capacity,
        "assigned_driver_id": None,
        "created_at":         now,
        "updated_at":         now,
    }
    db = get_database()
    result = await db[settings.vehicles_collection].insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info(f"Vehicle created: {result.inserted_id}")
    return _serialise(doc)


@router.put("/{vehicle_id}")
async def update_vehicle(vehicle_id: str, body: VehicleUpdate):
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.make is not None:
        updates["make"] = body.make.strip()
    if body.name is not None:
        updates["vehicle_name"] = body.name.strip()
    if body.vehicleNumber is not None:
        updates["number_plate"] = body.vehicleNumber.strip()
    if body.type is not None:
        if body.type not in VEHICLE_TYPES:
            raise HTTPException(status_code=422, detail=f"type must be one of {sorted(VEHICLE_TYPES)}")
        updates["vehicle_type"] = body.type
    if body.capacity is not None:
        updates["capacity"] = body.capacity
    if "assignedDriverId" in body.model_fields_set:
        updates["assigned_driver_id"] = body.assignedDriverId or None

    db = get_database()
    result = await db[settings.vehicles_collection].find_one_and_update(
        {"_id": _oid(vehicle_id)},
        {"$set": updates},
        return_document=True,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return _serialise(result)


@router.delete("/{vehicle_id}", status_code=204)
async def delete_vehicle(vehicle_id: str):
    db = get_database()
    result = await db[settings.vehicles_collection].delete_one({"_id": _oid(vehicle_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
