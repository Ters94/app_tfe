from pydantic import BaseModel
from backend.models.base import MongoBaseModel


class MembershipCreate(BaseModel):
    user_id: str
    role: str = "MEMBER"


class MembershipInDB(MongoBaseModel):
    user_id: str
    group_id: str
    role: str = "MEMBER"


class MembershipPublic(BaseModel):
    id: str
    user_id: str
    group_id: str
    username: str | None = None
    email: str | None = None

    role: str