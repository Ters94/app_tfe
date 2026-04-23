from pydantic import BaseModel, EmailStr
from backend.models.base import MongoBaseModel
from backend.models.role import RoleEnum


class UserBase(BaseModel):
    lastname: str
    name: str

    username: str
    phone: str | None = None
    address: str | None = None

    email: EmailStr
    role: RoleEnum = RoleEnum.USER


class UserCreate(UserBase):
    password: str


class UserInDB(MongoBaseModel, UserBase):
    password_hash: str


class UserPublic(UserBase):
    id: str

class UserUpdate(BaseModel):
    name: str | None = None
    lastname: str | None = None
    username: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    adress: str | None = None
    role: RoleEnum | None = None
