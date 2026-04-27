from datetime import datetime
from pydantic import BaseModel, Field
from backend.models.base import MongoBaseModel


class AuditInDB(MongoBaseModel):
    action: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    target_type: str
    target_id: str
    target_label: str | None = None

    user_id: str
    group_id: str | None = None

    old_values: dict | None = None
    new_values: dict | None = None


class AuditPublic(BaseModel):
    id: str
    action: str
    timestamp: datetime

    target_type: str
    target_id: str
    target_label: str | None = None

    user_id: str
    group_id: str | None = None

    old_values: dict | None = None
    new_values: dict | None = None