from __future__ import annotations

import hmac

from app.config import settings


def validate_token(token: str | None) -> bool:
    if not token:
        return False
    return hmac.compare_digest(token, settings.jotform_webhook_secret)


def validate_form_id(form_id: str) -> bool:
    return form_id == settings.jotform_form_id
