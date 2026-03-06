from pydantic import BaseModel
from backend.models.base import MongoBaseModel
from bson import ObjectId


class GroupBase(BaseModel):
    name: str
    description: str | None = None


class GroupCreate(GroupBase):
    pass


class GroupInDB(MongoBaseModel, GroupBase):
    owner_id: str


class GroupPublic(GroupBase):
    id: str
    owner_id: str
