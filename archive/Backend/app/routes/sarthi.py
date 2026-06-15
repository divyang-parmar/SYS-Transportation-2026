import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.services.mongodb_service import get_database

router = APIRouter(tags=["Sarthi"])
logger = logging.getLogger(__name__)


def _serialise(doc: dict) -> dict:
    return {
        "id":    str(doc["_id"]),
        "name":  doc.get("full_name", ""),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "role":  "driver",
    }


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid sarthi id")


class SarthiCreate(BaseModel):
    name: str
    email: str
    phone: str


@router.get("/")
async def list_sarthis():
    db = get_database()
    docs = await db[settings.sarthi_collection].find({}).to_list(None)
    return [_serialise(d) for d in docs]


@router.get("/find-by-email")
async def find_sarthi_by_email(email: str = Query(...)):
    db = get_database()
    doc = await db[settings.sarthi_collection].find_one({"email": email.strip().lower()})
    if not doc:
        raise HTTPException(status_code=404, detail="Sarthi not found")
    return _serialise(doc)


@router.get("/{sarthi_id}")
async def get_sarthi(sarthi_id: str):
    db = get_database()
    doc = await db[settings.sarthi_collection].find_one({"_id": _oid(sarthi_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Sarthi not found")
    return _serialise(doc)


@router.post("/", status_code=201)
async def create_sarthi(body: SarthiCreate):
    email = body.email.strip().lower()
    phone = body.phone.strip()
    db = get_database()

    existing_email = await db[settings.sarthi_collection].find_one({"email": email})
    if existing_email:
        return JSONResponse(status_code=409, content={"detail": f"{email} is already registered.", "existing_id": str(existing_email["_id"])})

    if phone:
        existing_phone = await db[settings.sarthi_collection].find_one({"phone": phone})
        if existing_phone:
            return JSONResponse(status_code=409, content={"detail": f"Phone number {phone} is already registered.", "existing_id": str(existing_phone["_id"])})

    doc = {
        "full_name":  body.name.strip(),
        "email":      email,
        "phone":      phone,
        "role":       "sarthi",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db[settings.sarthi_collection].insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info(f"Sarthi created: {result.inserted_id} ({email})")
    return _serialise(doc)


@router.delete("/{sarthi_id}", status_code=204)
async def delete_sarthi(sarthi_id: str):
    db = get_database()
    try:
        oid = ObjectId(sarthi_id)
        query = {"$or": [{"_id": oid}, {"_id": sarthi_id}]}
    except InvalidId:
        query = {"_id": sarthi_id}
    result = await db[settings.sarthi_collection].delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sarthi not found")
