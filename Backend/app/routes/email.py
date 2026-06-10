import logging

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.services.email_service import ROLE_LABELS, send_invite_email
from app.services.mongodb_service import get_database

router = APIRouter(tags=["Email"])
logger = logging.getLogger(__name__)

_DEFAULT_SUBJECT = "You're invited to Airport Transportation Management App"
_DEFAULT_BODY = (
    "Hi {{name}},\n\n"
    "You've been invited to the Airport Transportation Management App as {{role}}.\n\n"
    "Login with your email: {{email}}\n\n"
    "Open the app at: {{app_url}}\n\n"
    "This invitation was sent by a Super Admin. If you weren't expecting this, you can safely ignore this email."
)


def _substitute(text: str, variables: dict) -> str:
    for key, value in variables.items():
        text = text.replace(f"{{{{{key}}}}}", value)
    return text


class InviteRequest(BaseModel):
    name: str
    email: EmailStr
    role: str


@router.post("/send-invite")
async def send_invite(body: InviteRequest):
    # Fetch the saved "User Invitation" email template from MongoDB.
    db = get_database()
    doc = await db[settings.templates_collection].find_one(
        {"_id": "email-invite", "deleted": {"$ne": True}}
    )

    raw_subject = doc["subject"] if doc and doc.get("subject") else _DEFAULT_SUBJECT
    raw_body    = doc["body"]    if doc and doc.get("body")    else _DEFAULT_BODY

    variables = {
        "name":    body.name,
        "email":   body.email,
        "role":    ROLE_LABELS.get(body.role, body.role),
        "app_url": "https://sps-transportation-2026.vercel.app/",
    }

    subject   = _substitute(raw_subject, variables)
    body_text = _substitute(raw_body, variables)

    sent = await send_invite_email(body.name, body.email, body.role, subject, body_text, variables["app_url"])
    return {"sent": sent, "email": body.email}
