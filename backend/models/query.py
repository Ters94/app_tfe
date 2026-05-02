from typing import Dict,Any

from pydantic import BaseModel, Field
from backend.models.base import MongoBaseModel, PyObjectId


class QueryCreate(BaseModel):
    query_name: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    group_id: str


class Query(MongoBaseModel):
    query_name: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    created_by: PyObjectId = Field(...)
    group_id: PyObjectId = Field(...)