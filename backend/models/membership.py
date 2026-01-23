from pydantic import Field
from backend.models.base import MongoBaseModel, PyObjectId


class Membership(MongoBaseModel):
    user_id: PyObjectId = Field(...)
    group_id: PyObjectId = Field(...)
#on utilise les id car Mongodb gere les relations via les id pas comme un ORM SQL 