from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from backend.database import db
from backend.security import get_current_user
from backend.models.membership import MembershipCreate, MembershipPublic


router = APIRouter(prefix="/groups", tags=["Memberships"])


def is_admin(user_id: str) -> bool:
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return user is not None and user.get("role") == "ADMIN"


def can_manage_group_members(group: dict, user_id: str) -> bool:
    return group.get("owner_id") == user_id or is_admin(user_id)


def can_view_group_members(group_id: str, group: dict, user_id: str) -> bool:
    if group.get("owner_id") == user_id or is_admin(user_id):
        return True

    membership = db.memberships.find_one({
        "group_id": group_id,
        "user_id": user_id
    })

    return membership is not None


@router.get("/{group_id}/members", response_model=List[MembershipPublic])
def get_group_members(
    group_id: str,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    group = db.groups.find_one({"_id": ObjectId(group_id)})

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if not can_view_group_members(group_id, group, current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    memberships = db.memberships.find({"group_id": group_id})
    result = []

    for membership in memberships:

        user_id = membership.get("user_id")
        user = None

        if user_id and ObjectId.is_valid(user_id):
            user = db.users.find_one({"_id": ObjectId(user_id)})

        result.append(
            MembershipPublic(
                id=str(membership["_id"]),
                user_id=membership.get("user_id", ""),
                group_id=membership.get("group_id", ""),
                role=membership.get("role", "MEMBER"),
                username=user.get("username") if user else None,
                email=user.get("email") if user else None
            )
        )

    return result


@router.post("/{group_id}/members", response_model=MembershipPublic)
def add_member_to_group(
    group_id: str,
    membership: MembershipCreate,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    if not ObjectId.is_valid(membership.user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    group = db.groups.find_one({
        "_id": ObjectId(group_id),
        "status": True
    })

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if not can_manage_group_members(group, current_user):
        raise HTTPException(status_code=403, detail="Only OWNER or ADMIN can add members")

    user = db.users.find_one({"_id": ObjectId(membership.user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.memberships.find_one({
        "group_id": group_id,
        "user_id": membership.user_id
    })

    if existing:
        raise HTTPException(status_code=400, detail="User already member of this group")

    membership_doc = {
        "group_id": group_id,
        "user_id": membership.user_id,
        "role": membership.role
    }

    result = db.memberships.insert_one(membership_doc)

    return MembershipPublic(
        id=str(result.inserted_id),
        group_id=group_id,
        user_id=membership.user_id,
        role=membership.role,
        username=user.get("username"),
        email=user.get("email")
    )


@router.delete("/{group_id}/members/{membership_id}")
def remove_member_from_group(
    group_id: str,
    membership_id: str,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    if not ObjectId.is_valid(membership_id):
        raise HTTPException(status_code=400, detail="Invalid membership id")

    group = db.groups.find_one({
        "_id": ObjectId(group_id),
        "status": True
    })

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if not can_manage_group_members(group, current_user):
        raise HTTPException(status_code=403, detail="Only OWNER or ADMIN can remove members")

    membership = db.memberships.find_one({
        "_id": ObjectId(membership_id),
        "group_id": group_id
    })

    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    if membership.get("role") == "OWNER":
        raise HTTPException(status_code=400, detail="Cannot remove OWNER")

    db.memberships.delete_one({"_id": ObjectId(membership_id)})

    return {"message": "Member removed"}