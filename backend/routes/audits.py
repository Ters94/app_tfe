from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId

from backend.database import db
from backend.security import get_current_admin, get_current_user
from backend.models.audit import AuditPublic
from fastapi.responses import StreamingResponse
from backend.services.pdf_service import generate_audit_pdf

router = APIRouter(prefix="/audits", tags=["Audits"])


@router.get("/groups/{group_id}", response_model=List[AuditPublic])
def get_group_audits(
    group_id: str,
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")


    if not ObjectId.is_valid(str(current_user)):
        raise HTTPException(status_code=400, detail="Invalid user id")
    


    current_user_id = str(current_user)
    user_doc = db.users.find_one({"_id": ObjectId(current_user_id)})
    current_user_role = user_doc.get("role") if user_doc else None

    group = db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user_role != "ADMIN":
        membership = db.memberships.find_one({
            "group_id": group_id,
            "user_id": current_user_id
        })

        is_owner = str(group.get("owner_id")) == current_user_id

        if not membership and not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized")

    audits = db.audits.find({"group_id": group_id}).sort("timestamp", -1)

    result = []

    for a in audits:
        audit_user = None
        audit_user_id = a.get("user_id", "")

        if audit_user_id and ObjectId.is_valid(audit_user_id):
            audit_user = db.users.find_one({"_id": ObjectId(audit_user_id)})

        result.append(
            AuditPublic(
                id=str(a["_id"]),
                action=a.get("action", ""),
                timestamp=a.get("timestamp"),

                target_type=a.get("target_type", ""),
                target_id=a.get("target_id", ""),
                target_label=a.get("target_label"),

                user_id=audit_user_id,
                username=(
                    audit_user.get("username")
                    or audit_user.get("name")
                    if audit_user else "Utilisateur inconnu"
                ),

                group_id=a.get("group_id"),
                old_values=a.get("old_values"),
                new_values=a.get("new_values")
            )
        )

    return result
@router.get("/groups/{group_id}/export-pdf")
def export_group_audit_pdf(
    group_id: str,
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid group id"
        )

    group = db.groups.find_one({
        "_id": ObjectId(group_id)
    })

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )

    current_user_id = str(current_user)

    user_doc = db.users.find_one({
        "_id": ObjectId(current_user_id)
    })

    current_user_role = (
        user_doc.get("role")
        if user_doc else None
    )

    if current_user_role != "ADMIN":

        membership = db.memberships.find_one({
            "group_id": group_id,
            "user_id": current_user_id
        })

        is_owner = (
            str(group.get("owner_id")) == current_user_id
        )

        if not membership and not is_owner:
            raise HTTPException(
                status_code=403,
                detail="Not authorized"
            )

    audits_cursor = db.audits.find({
        "group_id": group_id
    }).sort("timestamp", -1)

    audits = list(audits_cursor)

    pdf_buffer = generate_audit_pdf(
        group_name=group.get("name"),
        audits=audits
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            f"attachment; filename=audit_{group.get('name')}.pdf"
        }
    )