from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from backend.database import db, get_users_collection
from backend.models import user
from backend.models.user import UserCreate, UserInDB, UserPublic, UserUpdate
from backend.security import get_password_hash
from fastapi import Depends
from backend.security import get_current_user, get_current_admin



router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserPublic)
def create_user(user: UserCreate, admin = Depends(get_current_admin)):
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    user_db = UserInDB(
        lastname=user.lastname,
        name=user.name,
        username=user.username,
        email=user.email,
        phone=user.phone,
        address=user.address,
        role=user.role,
        password_hash=get_password_hash(user.password)
    )

    db.users.insert_one(user_db.model_dump(by_alias=True))

    return UserPublic(
        id=str(user_db.id),
        lastname=user_db.lastname,
        name=user_db.name,  
        username=user_db.username,
        email=user_db.email,
        phone=user_db.phone,
        address=user_db.address,
        role=user_db.role
    )

@router.get("/", response_model=List[UserPublic])
def get_users(current_user: str = Depends(get_current_user)):
    users_collection = get_users_collection()
    users = users_collection.find()

    result = []

    for user in users:
        result.append(
            UserPublic(
                id=str(user["_id"]),
                lastname=user.get("lastname", ""),
                name=user.get("name", ""),
                username=user.get("username", ""),
                email=user.get("email", ""),
                phone=user.get("phone"),
                address=user.get("address"),
                role=user.get("role")
            )
        )

    return result

@router.get("/me", response_model=UserPublic)
def get_me(current_user: str = Depends(get_current_user)):

    users_collection = get_users_collection()

    user = users_collection.find_one({"_id": ObjectId(current_user)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserPublic(
        id=str(user["_id"]),
        lastname=user.get("lastname", ""),
        name=user.get("name", ""),
        username=user.get("username", ""),
        email=user.get("email", ""),
        phone=user.get("phone"),
        address=user.get("address"),
        role=user.get("role")
    )

@router.get("/{user_id}", response_model=UserPublic)
def get_user_by_id(user_id: str,):
    users_collection = get_users_collection()

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserPublic(
        id=str(user["_id"]),
        lastname=user.get("lastname", ""),
        name=user.get("name", ""),
        username=user.get("username", ""),
        email=user.get("email", ""),
        phone=user.get("phone"),
        address=user.get("address"),
        role=user.get("role")
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, admin = Depends(get_current_admin)):
    users_collection = get_users_collection()

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = users_collection.delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return None
@router.put("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: str,
    data: UserUpdate,
    admin = Depends(get_current_admin)
):
    users_collection = get_users_collection()

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    update_data = {
        k: v for k, v in data.dict().items() if v is not None
    }

    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = users_collection.find_one({"_id": ObjectId(user_id)})

    return UserPublic(
        id=str(updated_user["_id"]),
        lastname=updated_user.get("lastname", ""),
        name=updated_user.get("name", ""),
        username=updated_user.get("username", ""),
        email=updated_user.get("email", ""),
        phone=updated_user.get("phone"),
        address=updated_user.get("address"),
        role=updated_user.get("role")
    )

