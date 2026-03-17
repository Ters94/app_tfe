from unittest import result

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from backend.database import db
from backend.models import membership
from backend.models.group import GroupCreate, GroupPublic, GroupInDB, GroupUpdate
from backend.security import get_current_user
from backend.models.membership import Membership

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
    
@router.post("/{group_id}/members")
def add_member(
    group_id: str,
    user_id: str,
    current_user: str = Depends(get_current_user)
):

    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    group = db.groups.find_one({
        "_id": ObjectId(group_id),
        "status": True
    })

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    allowed = False

    if group["owner_id"] == current_user:
        allowed = True
    else:

        membership = db.memberships.find_one({
        "group_id": ObjectId(group_id),
        "user_id": ObjectId(current_user)
    })
        allowed = membership is not None

    if not allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    membership = Membership(
        user_id=ObjectId(user_id),
        group_id=ObjectId(group_id)
    )
    result = db.memberships.insert_one(membership.model_dump(by_alias=True))

    return {
        "id": str(result.inserted_id),
        "user_id": user_id,
        "group_id": group_id
    }

@router.get("/{group_id}/members")
def get_group_members(
    group_id: str,
    current_user: str = Depends(get_current_user)
    ):

        if not ObjectId.is_valid(group_id):
            raise HTTPException(status_code=400, detail="Invalid group id")

        group = db.groups.find_one({
        "_id": ObjectId(group_id),
        "status": True
        })

        if not group:
            raise HTTPException(status_code=404, detail="Group not found")


        result = []

        owner = db.users.find_one({
        "_id": ObjectId(group["owner_id"])
    })

        if owner:
            result.append({
            "user_id": str(owner["_id"]),
            "username": owner.get("username"),
            "email": owner.get("email"),
            "role": "owner"
        })

        memberships = db.memberships.find({
            "group_id": ObjectId(group_id)
        })

        for m in memberships:
            user = db.users.find_one({
            "_id": m["user_id"]
            })

            if user:

                if str(user["_id"]) == str(group["owner_id"]):
                    continue

                result.append({
                "user_id": str(user["_id"]),
                "username": user.get("username"),
                "email": user.get("email")
            })

        return result

@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: str,
    user_id: str,
    current_user: str = Depends(get_current_user)
):

    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    group = db.groups.find_one({
        "_id": ObjectId(group_id),
        "status": True
    })

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

   
    allowed = False

    if group["owner_id"] == current_user:
        allowed = True
    else:
        membership = db.memberships.find_one({
            "group_id": ObjectId(group_id),
            "user_id": ObjectId(current_user)
        })

        allowed = membership is not None

    if not allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 🔹 supprimer membership
    result = db.memberships.delete_one({
        "group_id": ObjectId(group_id),
        "user_id": ObjectId(user_id)
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")

    return {"message": "Member removed"}