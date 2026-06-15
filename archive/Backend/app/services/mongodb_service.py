from __future__ import annotations

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    return get_client()[settings.mongodb_database]


async def insert_submission(doc: dict) -> str:
    db = get_database()
    result = await db[settings.mongodb_collection].insert_one(doc)
    return str(result.inserted_id)


async def insert_flight_details(doc: dict) -> str:
    db = get_database()
    result = await db[settings.flight_details_collection].insert_one(doc)
    return str(result.inserted_id)


async def insert_booking(doc: dict) -> str:
    db = get_database()
    result = await db[settings.bookings_collection].insert_one(doc)
    return str(result.inserted_id)


async def ping() -> bool:
    try:
        await get_client().admin.command("ping")
        return True
    except Exception as exc:
        logger.warning(f"MongoDB ping failed: {exc}")
        return False
