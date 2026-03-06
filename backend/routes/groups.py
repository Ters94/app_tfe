from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from backend.database import db
from backend.models.group import GroupCreate, GroupPublic, GroupInDB, GroupUpdate
from backend.security import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/", response_model=GroupPublic)
def create_group(
    group: GroupCreate,
    current_user: str = Depends(get_current_user)
):
    group_db = GroupInDB(
        name=group.name,
        description=group.description,
        owner_id=current_user
    )

    result = db.groups.insert_one(group_db.model_dump(by_alias=True))

    return GroupPublic(
        id=str(result.inserted_id),
        name=group.name,
        description=group.description,
        owner_id=current_user
    )


@router.get("/", response_model=List[GroupPublic])
def get_groups(name: str | None = None,
               current_user = Depends(get_current_user)
               ):

    query = {"owner_id": current_user,
             "status": True
             }

    if name:
        query["name"] = {"$regex": name, "$options": "i"}

    groups = db.groups.find(query)

    result = []

    for g in groups:
         result.append(
            GroupPublic(
                id=str(g["_id"]),
                name=g["name"],
                description=g.get("description"),
                owner_id=g["owner_id"]
            )
        )
    return result

@router.get("/{group_id}", response_model=GroupPublic)
def get_groups(group_id: str, current_user: str = Depends(get_current_user)):

    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")
    
    group = db.groups.find_one({"_id": ObjectId(group_id),
                                "status": True
                                })

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    

    if group["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return GroupPublic(
        id=str(group["_id"]),
        name=group["name"],
        description=group.get("description"),
        owner_id=group["owner_id"]
    )
@router.put("/{group_id}", response_model=GroupPublic)
def update_group(
    group_id: str,
    group_update: GroupUpdate,
    current_user: str = Depends(get_current_user)
    ):

    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")
    
    group = db.groups.find_one({"_id": ObjectId(group_id)})

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    

    if group["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data ={
        k: v for k, v in group_update.model_dump().items() if v is not None
    }

    if update_data:
        db.groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$set": update_data}
        )

    updated_group = db.groups.find_one({"_id": ObjectId(group_id)})

    return GroupPublic(
        id=str(updated_group["_id"]),
        name=updated_group["name"],
        description=updated_group.get("description"),
        owner_id=updated_group["owner_id"]
    )

@router.delete("/{group_id}")
def desactivate_group(
    group_id: str,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")
    
    group = db.groups.find_one({"_id": ObjectId(group_id)})

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    

    if group["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": {"status": False}}
    )

    return {"message": "Group desactivated"}
    