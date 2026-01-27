from pydantic import BaseModel, EmailStr
from backend.models.base import MongoBaseModel
from backend.models.role import RoleEnum


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: RoleEnum = RoleEnum.USER


class UserCreate(UserBase):
    password: str


class UserInDB(MongoBaseModel, UserBase):
    password_hash: str


class UserPublic(UserBase):
    id: str
