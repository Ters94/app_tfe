from fastapi import APIRouter, Depends, HTTPException, Request
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




@router.get("/filter-options")
def get_filter_options(current_user=Depends(get_current_user)):
    return {
        "portfolio": sorted(db.deals.distinct("portfolio")),
        "product": sorted(db.deals.distinct("product")),
        "deal_type": sorted(db.deals.distinct("deal_type")),
        "trader_code": sorted(db.deals.distinct("trader_code")),
        "counterparty_name": sorted(db.deals.distinct("counterparty_name")),
        "business_unit": sorted(db.deals.distinct("business_unit")),
        "delivery_point": sorted(db.deals.distinct("delivery_point")),
        "booking_status": sorted(db.deals.distinct("booking_status")),
    }


@router.get("/search")
def search_deals(request: Request):
    allowed_filters = [
        "deal_type",
        "product",
        "portfolio",
        "desk",
        "trader_code",
        "counterparty_name",
        "business_unit",
        "delivery_point",
        "delivery_type",
        "transport_corridor",
        "booking_status",
    ]

    filter_query = {}

    for key, value in request.query_params.items():

        if value == "":
            continue
        # filtres texte simples
        if key in allowed_filters:
            filter_query[key] = value

        # filtres numériques
        elif key == "price_min":
            filter_query["price"] = filter_query.get("price", {})
            filter_query["price"]["$gte"] = float(value)

        elif key == "price_max":
            filter_query["price"] = filter_query.get("price", {})
            filter_query["price"]["$lte"] = float(value)

            

        elif key == "volume_min":
            filter_query["volume"] = filter_query.get("volume", {})
            filter_query["volume"]["$gte"] = float(value)

        elif key == "volume_max":
            filter_query["volume"] = filter_query.get("volume", {})
            filter_query["volume"]["$lte"] = float(value)

    deals = list(db.deals.find(filter_query))

    for deal in deals:
        deal["id"] = str(deal["_id"])
        deal.pop("_id", None)

    return {
        "filters_used": filter_query,
        "count": len(deals),
        "results": deals
    }


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
