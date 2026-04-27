from datetime import datetime
from pydantic import BaseModel, Field
from backend.models.base import MongoBaseModel
from bson import ObjectId


class GroupBase(BaseModel):
    name: str
    description: str | None = None


class GroupCreate(GroupBase):
    pass


class GroupInDB(MongoBaseModel, GroupBase):
    owner_id: str
    status: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GroupPublic(GroupBase):
    id: str
    owner_id: str
    owner_username: str | None = None
    status: bool=True
    created_at: datetime | None = None

class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None