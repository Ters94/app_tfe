from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from backend.database import db, get_groups_collection
from backend.models import group
from backend.models.group import GroupCreate, GroupPublic, GroupInDB, GroupUpdate
from backend.security import get_current_user
from backend.models.role import RoleEnum
from backend.services.audit_service import create_audit

router = APIRouter(prefix="/groups", tags=["Groups"])


def is_admin(user_id: str) -> bool:
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return user is not None and user.get("role") == RoleEnum.ADMIN


def create_audit(
    action: str,
    current_user: str,
    group_id: str,
    target_label: str | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None
):
    db.audits.insert_one({
        "action": action,
        "timestamp": datetime.utcnow(),

        "target_type": "GROUP",
        "target_id": group_id,
        "target_label": target_label,

        "user_id": current_user,
        "group_id": group_id,

        "old_values": old_values,
        "new_values": new_values
    })


@router.post("/", response_model=GroupPublic)
def create_group(
    group: GroupCreate,
    current_user: str = Depends(get_current_user)
):
    user = db.users.find_one({"_id": ObjectId(current_user)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") == "ADMIN":
        if not group.owner_id:
            raise HTTPException(status_code=400, detail="Owner is required for admin")

        if not ObjectId.is_valid(group.owner_id):
            raise HTTPException(status_code=400, detail="Invalid owner id")

        owner = db.users.find_one({"_id": ObjectId(group.owner_id)})

        if not owner:
            raise HTTPException(status_code=404, detail="Owner not found")

        owner_id = group.owner_id
    else:
        owner_id = current_user

    group_db = GroupInDB(
        name=group.name,
        description=group.description,
        owner_id=owner_id
    )

    result = db.groups.insert_one(group_db.model_dump(by_alias=True))
    group_id = str(result.inserted_id)

    db.memberships.insert_one({
        "group_id": group_id,
        "user_id": owner_id,
        "role": "OWNER"
    })

    create_audit(
        action="CREATE",
        current_user=current_user,
        group_id=group_id,
        target_label=group.name,
        old_values=None,
        new_values={
            "name": group.name,
            "description": group.description,
            "owner_id": owner_id,
            "status": True
        }
    )

    return GroupPublic(
        id=group_id,
        name=group.name,
        description=group.description,
        owner_id=owner_id,
        owner_username=owner.get("username") if user.get("role") == "ADMIN" else user.get("username"),
        status=True
    )


@router.get("/", response_model=List[GroupPublic])
def get_groups(
    name: str | None = None,
    current_user=Depends(get_current_user)
):
    query = {}

    if name:
        query["name"] = {"$regex": name, "$options": "i"}

    groups = db.groups.find(query)
    result = []

    for g in groups:
        owner = None

        if ObjectId.is_valid(g.get("owner_id", "")):
            owner = db.users.find_one({"_id": ObjectId(g["owner_id"])})

        result.append(
            GroupPublic(
                id=str(g["_id"]),
                name=g.get("name", ""),
                description=g.get("description"),
                owner_id=g.get("owner_id", ""),
                owner_username=owner.get("username") if owner else None,
                status=g.get("status", True),
                created_at=g.get("created_at")
            )
        )

    return result

@router.get("/my-groups", response_model=List[GroupPublic])
def get_my_groups(current_user: str = Depends(get_current_user)):
    user = db.users.find_one({"_id": ObjectId(current_user)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") == "ADMIN":
        groups = db.groups.find({"status": True})
    else:
        memberships = db.memberships.find({"user_id": current_user})

        group_ids = []

        for membership in memberships:
            group_id = membership.get("group_id")

            if ObjectId.is_valid(group_id):
                group_ids.append(ObjectId(group_id))

        groups = db.groups.find({
            "_id": {"$in": group_ids},
            "status": True
        })

    result = []

    for g in groups:
        owner = None

        if ObjectId.is_valid(g.get("owner_id", "")):
            owner = db.users.find_one({"_id": ObjectId(g["owner_id"])})

        result.append(
            GroupPublic(
                id=str(g["_id"]),
                name=g.get("name", ""),
                description=g.get("description"),
                owner_id=g.get("owner_id", ""),
                owner_username=owner.get("username") if owner else None,
                status=g.get("status", True),
                created_at=g.get("created_at")
            )
        )

    return result

@router.get("/{group_id}", response_model=GroupPublic)
def get_group_by_id(
    group_id: str,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    group = db.groups.find_one({"_id": ObjectId(group_id)})

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")


    membership = db.memberships.find_one({
        "group_id": group_id,
        "user_id": current_user
    })

    if group["owner_id"] != current_user and not membership and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    owner = None

    if ObjectId.is_valid(group.get("owner_id", "")):
        owner = db.users.find_one({"_id": ObjectId(group["owner_id"])})

    return GroupPublic(
        id=str(group["_id"]),
        name=group.get("name", ""),
        description=group.get("description"),
        owner_id=group.get("owner_id", ""),
        owner_username=owner.get("username") if owner else None,
        status=group.get("status", True),
        created_at=group.get("created_at")
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

    if group["owner_id"] != current_user and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {
        k: v for k, v in group_update.model_dump().items()
        if v is not None
    }

    old_values = {
        "name": group.get("name"),
        "description": group.get("description")
    }

    if update_data:
        db.groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$set": update_data}
        )

        create_audit(
            action="UPDATE",
            current_user=current_user,
            group_id=group_id,
            target_label=group.get("name"),
            old_values=old_values,
            new_values=update_data
        )

    updated_group = db.groups.find_one({"_id": ObjectId(group_id)})

    owner = None

    if ObjectId.is_valid(updated_group.get("owner_id", "")):
        owner = db.users.find_one({"_id": ObjectId(updated_group["owner_id"])})

    return GroupPublic(
        id=str(updated_group["_id"]),
        name=updated_group.get("name", ""),
        description=updated_group.get("description"),
        owner_id=updated_group.get("owner_id", ""),
        owner_username=owner.get("username") if owner else None,
        status=updated_group.get("status", True),
        created_at=updated_group.get("created_at")
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

    if group["owner_id"] != current_user and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": {"status": False}}
    )

    create_audit(
        action="DEACTIVATE",
        current_user=current_user,
        group_id=group_id,
        target_label=group.get("name"),
        old_values={"status": group.get("status", True)},
        new_values={"status": False}
    )

    return {"message": "Group desactivated"}

@router.put("/{group_id}/transfer-owner")
def transfer_owner(
    group_id: str,
    new_owner_id: str,
    current_user=Depends(get_current_user)
):
    groups_collection = get_groups_collection()

    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")

    if not ObjectId.is_valid(new_owner_id):
        raise HTTPException(status_code=400, detail="Invalid new owner ID")

    group = groups_collection.find_one({
        "_id": ObjectId(group_id),
        "status": True
    })

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    current_owner_id = group.get("owner_id")

    if current_owner_id != current_user and not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Seul l’owner actuel ou l'admin peut transférer la propriété du groupe."
        )

    new_owner = db.users.find_one({"_id": ObjectId(new_owner_id)})
    if not new_owner:
        raise HTTPException(
            status_code=404,
            detail="Le nouvel owner n'existe pas."
        )

    membership = db.memberships.find_one({
        "group_id": group_id,
        "user_id": new_owner_id
    })

    if not membership:
        raise HTTPException(
            status_code=400,
            detail="Le nouvel owner doit être membre du groupe."
        )

    old_owner = db.users.find_one({"_id": ObjectId(current_owner_id)})
    new_owner = db.users.find_one({"_id": ObjectId(new_owner_id)})

    old_values = {
        "group_name": group.get("name"),
        "old_owner_username": old_owner.get("username") if old_owner else "Unknown",
        "old_owner_email": old_owner.get("email") if old_owner else "Unknown",
        "old_owner_id": current_owner_id
    }

    new_values = {
        "group_name": group.get("name"),
        "new_owner_username": new_owner.get("username") if new_owner else "Unknown",
        "new_owner_email": new_owner.get("email") if new_owner else "Unknown",
        "new_owner_id": new_owner_id
    }


    groups_collection.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": {"owner_id": new_owner_id}}
    )

    db.memberships.update_many(
    {"group_id": group_id, "role": "OWNER"},
    {"$set": {"role": "MEMBER"}}
)

    db.memberships.update_one(
    {
        "group_id": group_id, 
        "user_id": new_owner_id
     },
    {
        "$set": {"role": "OWNER"}
    }
)
    create_audit(
    action="TRANSFER_OWNER",
    current_user=current_user,
    group_id=group_id,
    target_label=group.get("name"),
    old_values=old_values,
    new_values=new_values
)


    return {
        "message": "Ownership transféré avec succès",
        "group_id": group_id,
        "old_owner_id": current_owner_id,
        "new_owner_id": new_owner_id}