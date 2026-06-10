from datetime import datetime
from typing import Any
from pydantic import BaseModel


class SubmissionDocument(BaseModel):
    submissionID: str
    formID: str
    received_at: datetime
    raw_fields: dict[str, Any]
    raw_request_json: str
    pretty: str
