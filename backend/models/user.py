from pydantic import BaseModel, EmailStr,Field
from backend.models.base import MongoBaseModel
from backend.models.role import RoleEnum


class UserBase(BaseModel):
    lastname: str
    name: str

    username: str
    phone: str  | None = Field(
        default=None,
                        pattern=r'^(\+?\d{1,3})?[0-9]{9,12}$')
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
    phone: str | None = Field(
        default=None,
        pattern=r'^(\+?[1-9]\d{1,3})?\d{8,12}$'
    )
    address: str | None = None
    role: RoleEnum | None = None
    password: str | None = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str
