from datetime import datetime
from pydantic import BaseModel, Field
from backend.models.base import MongoBaseModel
from bson import ObjectId


class GroupBase(BaseModel):
    name: str
    description: str | None = None


class GroupCreate(GroupBase):
    owner_id: str | None = None  # Seul un admin peut spécifier un owner_id, sinon c'est le current_user


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
    