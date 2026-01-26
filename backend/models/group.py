from backend.models.base import MongoBaseModel


class Group(MongoBaseModel):
    name: str
