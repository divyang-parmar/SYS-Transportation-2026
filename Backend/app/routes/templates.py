import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services.mongodb_service import get_database

router = APIRouter(tags=["Templates"])
logger = logging.getLogger(__name__)


def _serialise(doc: dict) -> dict:
    return {
        "id":        doc["_id"],       # _id is the template_id string (e.g. "email-invite")
        "channel":   doc.get("channel", "email"),
        "name":      doc.get("name", ""),
        "subject":   doc.get("subject"),
        "body":      doc.get("body", ""),
        "variables": doc.get("variables", []),
        "deleted":   doc.get("deleted", False),
    }


class TemplateUpsert(BaseModel):
    channel: str
    name: str
    subject: Optional[str] = None
    body: str
    variables: list[str]
    deleted: bool = False


@router.get("/")
async def list_templates():
    db = get_database()
    docs = await db[settings.templates_collection].find({}).to_list(None)
    return [_serialise(d) for d in docs]


@router.put("/{template_id}", status_code=200)
async def upsert_template(template_id: str, body: TemplateUpsert):
    doc = {
        "_id":        template_id,
        "channel":    body.channel,
        "name":       body.name,
        "subject":    body.subject,
        "body":       body.body,
        "variables":  body.variables,
        "deleted":    body.deleted,
        "updated_at": datetime.now(timezone.utc),
    }
    db = get_database()
    await db[settings.templates_collection].replace_one(
        {"_id": template_id},
        doc,
        upsert=True,
    )
    logger.info("Template upserted: %s", template_id)
    return _serialise(doc)


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str):
    """Remove a saved template — frontend falls back to the built-in default."""
    db = get_database()
    await db[settings.templates_collection].delete_one({"_id": template_id})
