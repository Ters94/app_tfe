from typing import List
from fastapi import APIRouter, HTTPException
from backend.database import db, get_users_collection
from backend.models.user import UserCreate, UserInDB, UserPublic

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserPublic)
def create_user(user: UserCreate):
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user_db = UserInDB(
        username=user.username,
        email=user.email,
        role=user.role,
        password_hash="hashed_password"  # temporaire
    )

    db.users.insert_one(user_db.model_dump(by_alias=True))

    return UserPublic(
        id=str(user_db.id),
        username=user_db.username,
        email=user_db.email,
        role=user_db.role
    )

@router.get("/", response_model=List[UserPublic])
def get_users():
    users_collection = get_users_collection()

    users = users_collection.find()
    result = []

    for user in users:
        user["id"] = str(user["_id"])
        result.append(user)

    return result

