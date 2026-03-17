from datetime import datetime
from pydantic import BaseModel, Field
from backend.models.base import MongoBaseModel, PyObjectId


class QueryBase(BaseModel):
    product: str
    filters: dict


class QueryCreate(QueryBase):
    pass


class QueryInDB(MongoBaseModel, QueryBase):
    group_id: PyObjectId = Field(...)
    created_by: PyObjectId = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class QueryPublic(QueryBase):
    id: str
    group_id: str
    created_by: str
    