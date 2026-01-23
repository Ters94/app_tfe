from pydantic import Field
from backend.models.base import MongoBaseModel, PyObjectId


class Query(MongoBaseModel):
    query_name: str
    created_by: PyObjectId = Field(...)
