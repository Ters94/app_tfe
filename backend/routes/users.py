from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
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

@router.get("/{user_id}", response_model=UserPublic)
def get_user_by_id(user_id: str):
    users_collection = get_users_collection()

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["id"] = str(user["_id"])
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str):
    users_collection = get_users_collection()

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = users_collection.delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return None