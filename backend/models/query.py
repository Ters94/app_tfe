from typing import Dict, Any, List, Optional

from pydantic import BaseModel, Field
from backend.models.base import MongoBaseModel


class QueryCreate(BaseModel):
    query_name: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    group_id: str
    selected_fields: Optional[Dict[str, Any]] = {}


class Query(MongoBaseModel):
    query_name: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    data_fields: List[str] = []
    created_by: str
    group_id: str