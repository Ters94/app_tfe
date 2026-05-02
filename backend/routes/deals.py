from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from typing import List
from datetime import datetime

from backend.database import db
from backend.models.deal import DealCreate, DealPublic
from backend.security import get_current_user
from backend.models.query import QueryCreate

router = APIRouter(prefix="/deals", tags=["Deals"])


@router.post("/test", response_model=DealPublic)
def create_test_deal(deal: DealCreate, current_user=Depends(get_current_user)):
    """
    Route uniquement pour créer des deals de test.
    Dans une vraie application, les deals viendraient d'un système externe.
    """

    deal_dict = deal.model_dump(mode="json")
    deal_dict["created_at"] = datetime.utcnow()

    result = db.deals.insert_one(deal_dict)

    return {
        "id": str(result.inserted_id),
        **deal_dict
    }


@router.get("/", response_model=List[DealPublic])
def get_deals(current_user=Depends(get_current_user)):
    """
    Liste les deals disponibles pour tester les filtres.
    """

    deals = []

    for deal in db.deals.find():
        deals.append({
            "id": str(deal["_id"]),
            "type": deal["type"],
            "product": deal["product"],
            "delivery_date": deal["delivery_date"],
            "amount": deal["amount"],
            "volume": deal["volume"],
            "created_at": deal.get("created_at")
        })

    return deals


@router.get("/{deal_id}", response_model=DealPublic)
def get_deal_by_id(deal_id: str, current_user=Depends(get_current_user)):

    if not ObjectId.is_valid(deal_id):
        raise HTTPException(status_code=400, detail="Invalid deal id")

    deal = db.deals.find_one({"_id": ObjectId(deal_id)})

    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    return {
        "id": str(deal["_id"]),
        "type": deal["type"],
        "product": deal["product"],
        "delivery_date": deal["delivery_date"],
        "amount": deal["amount"],
        "volume": deal["volume"],
        "created_at": deal.get("created_at")
    }