from pydantic import EmailStr
from backend.models.base import MongoBaseModel
from backend.models.role import RoleEnum


class User(MongoBaseModel):
    username: str
    email: EmailStr
    role: RoleEnum = RoleEnum.USER
