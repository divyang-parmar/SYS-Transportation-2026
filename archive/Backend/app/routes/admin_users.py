import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.services.mongodb_service import get_database

router = APIRouter(tags=["Admin Users"])
logger = logging.getLogger(__name__)

# Frontend uses "transportation_admin"; MongoDB schema requires "transport-admin".
ROLE_TO_DB   = {"transportation_admin": "transport-admin", "super_admin": "transport-super"}
ROLE_FROM_DB = {"transport-admin": "transportation_admin", "transport-super": "super_admin"}


def _serialise(doc: dict) -> dict:
    db_role = doc.get("role", "transport-admin")
    return {
        "id":    str(doc["_id"]),
        "name":  doc.get("full_name", ""),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "role":  ROLE_FROM_DB.get(db_role, db_role),
    }


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")


class AdminUserCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    role: str = "transportation_admin"


@router.get("/")
async def list_admin_users():
    db = get_database()
    docs = await db[settings.admin_users_collection].find({}).to_list(None)
    return [_serialise(d) for d in docs]


@router.get("/find-by-email")
async def find_admin_user_by_email(email: str = Query(...)):
    db = get_database()
    doc = await db[settings.admin_users_collection].find_one({"email": email.strip().lower()})
    if not doc:
        raise HTTPException(status_code=404, detail="Admin user not found")
    return _serialise(doc)


@router.post("/", status_code=201)
async def create_admin_user(body: AdminUserCreate):
    if body.role not in ROLE_TO_DB:
        raise HTTPException(status_code=422, detail=f"role must be one of {sorted(ROLE_TO_DB)}")

    email = body.email.strip().lower()
    db = get_database()

    existing = await db[settings.admin_users_collection].find_one({"email": email})
    if existing:
        return JSONResponse(status_code=409, content={"detail": f"{email} is already registered.", "existing_id": str(existing["_id"])})

    phone = body.phone.strip()
    if phone:
        existing_phone = await db[settings.admin_users_collection].find_one({"phone": phone})
        if existing_phone:
            return JSONResponse(status_code=409, content={"detail": f"Phone number {phone} is already registered.", "existing_id": str(existing_phone["_id"])})

    doc = {
        "full_name":  body.name.strip(),
        "email":      email,
        "phone":      phone,
        "role":       ROLE_TO_DB[body.role],
        "google_id":  email,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db[settings.admin_users_collection].insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info(f"Admin user created: {result.inserted_id} ({email})")
    return _serialise(doc)


@router.delete("/{user_id}", status_code=204)
async def delete_admin_user(user_id: str):
    db = get_database()
    try:
        oid = ObjectId(user_id)
        query = {"$or": [{"_id": oid}, {"_id": user_id}]}
    except InvalidId:
        query = {"_id": user_id}
    result = await db[settings.admin_users_collection].delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
