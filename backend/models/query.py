from typing import Dict,Any, List

from pydantic import BaseModel, Field
from backend.models.base import MongoBaseModel, PyObjectId


class QueryCreate(BaseModel):
    query_name: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    group_id: str
    data_fields: List[str] = []


class Query(MongoBaseModel):
    query_name: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    data_fields: List[str] = []
    created_by: PyObjectId = Field(...)
    group_id: PyObjectId = Field(...)