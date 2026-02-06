from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from backend.database import db
from backend.models.group import GroupCreate, GroupPublic, GroupInDB
from backend.security import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/", response_model=GroupPublic)
def create_group(
    group: GroupCreate,
    current_user = Depends(get_current_user)
):
    group_db = GroupInDB(
        name=group.name,
        description=group.description,
        owner_id=current_user
    )

    db.groups.insert_one(group_db.model_dump(by_alias=True))

    return GroupPublic(
        id=str(group_db.id),
        name=group_db.name,
        description=group_db.description,
        owner_id=current_user
    )


@router.get("/", response_model=List[GroupPublic])
def get_groups(current_user = Depends(get_current_user)):

    groups = db.groups.find({"owner_id": current_user})

    result = []

    for g in groups:
        g["id"] = str(g["_id"])
        result.append(g)

    return result
