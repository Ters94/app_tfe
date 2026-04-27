from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId

from backend.database import db
from backend.security import get_current_admin
from backend.models.audit import AuditPublic

router = APIRouter(prefix="/audits", tags=["Audits"])


@router.get("/groups/{group_id}", response_model=List[AuditPublic])
def get_group_audits(
    group_id: str,
    admin=Depends(get_current_admin)  
):
 
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

  
    audits = db.audits.find({"group_id": group_id}).sort("timestamp", -1)

    result = []

    for a in audits:
        result.append(
            AuditPublic(
                id=str(a["_id"]),
                action=a.get("action", ""),
                timestamp=a.get("timestamp"),

                target_type=a.get("target_type", ""),
                target_id=a.get("target_id", ""),
                target_label=a.get("target_label"),

                user_id=a.get("user_id", ""),
                group_id=a.get("group_id"),

                old_values=a.get("old_values"),
                new_values=a.get("new_values")
            )
        )

    return result