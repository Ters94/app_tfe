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
    deals = []
    for deal in db.deals.find():
        deal["id"] = str(deal["_id"])
        deal.pop("_id", None)
        deals.append(deal)
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
def search_deals(
    product: str = None,
    deal_type: str = None,
    portfolio: str = None,
    desk: str = None,
    trader_code: str = None,
    counterparty_name: str = None,
    business_unit: str = None,
    delivery_point: str = None,
    delivery_type: str = None,
    transport_corridor: str = None,
    booking_status: str = None,
    start_date: str = None,
    end_date: str = None,
    price_min: float = None,
    price_max: float = None,
    volume_min: float = None,
    volume_max: float = None,
):
    filter_query = {}

    if product:
        filter_query["product"] = product

    if deal_type:
        filter_query["deal_type"] = deal_type

    if portfolio:
        filter_query["portfolio"] = portfolio

    if desk:
        filter_query["desk"] = desk

    if trader_code:
        filter_query["trader_code"] = trader_code

    if counterparty_name:
        filter_query["counterparty_name"] = counterparty_name

    if business_unit:
        filter_query["business_unit"] = business_unit

    if delivery_point:
        filter_query["delivery_point"] = delivery_point

    if delivery_type:
        filter_query["delivery_type"] = delivery_type

    if transport_corridor:
        filter_query["transport_corridor"] = transport_corridor

    if booking_status:
        filter_query["booking_status"] = booking_status

    if start_date:
        filter_query["delivery_date"] = filter_query.get("delivery_date", {})
        filter_query["delivery_date"]["$gte"] = start_date + "T00:00:00Z"

    if end_date:
        filter_query["delivery_date"] = filter_query.get("delivery_date", {})
        filter_query["delivery_date"]["$lte"] = end_date + "T23:59:59Z"

    if price_min is not None:
        filter_query["price"] = filter_query.get("price", {})
        filter_query["price"]["$gte"] = price_min

    if price_max is not None:
        filter_query["price"] = filter_query.get("price", {})
        filter_query["price"]["$lte"] = price_max

    if volume_min is not None:
        filter_query["volume"] = filter_query.get("volume", {})
        filter_query["volume"]["$gte"] = volume_min

    if volume_max is not None:
        filter_query["volume"] = filter_query.get("volume", {})
        filter_query["volume"]["$lte"] = volume_max

    deals = list(db.deals.find(filter_query))

    for deal in deals:
        deal["id"] = str(deal["_id"])
        deal.pop("_id", None)

    return {
        "filters_used": filter_query,
        "count": len(deals),
        "results": deals
    }

@router.get("/statistics")
def get_deal_statistics(
    product: str,
    deal_type: str,
    start_date: str,
    end_date: str
):
    pipeline = [
        {
            "$match": {
                "product": product,
                "deal_type": deal_type,
                "delivery_date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "product": "$product",
                    "deal_type": "$deal_type"
                },
                "total_volume": {"$sum": "$volume"},
                "total_amount": {"$sum": "$amount"},
                "number_of_deals": {"$sum": 1}
            }
        },
        {
            "$project": {
                "_id": 0,
                "product": "$_id.product",
                "deal_type": "$_id.deal_type",
                "total_volume": 1,
                "total_amount": 1,
                "number_of_deals": 1,
                "average_price": {
                    "$round": [
                        {"$divide": ["$total_amount", "$total_volume"]},
                        2
                    ]
                }
            }
        }
    ]
    result = list(db.deals.aggregate(pipeline))

    if not result:
        return {
            "product": product,
            "deal_type": deal_type,
            "start_date": start_date,
            "end_date": end_date,
            "number_of_deals": 0,
            "total_volume": 0,
            "total_amount": 0,
            "average_price": 0
        }

    return result[0]

@router.get("/{deal_id}", response_model=DealPublic)
def get_deal_by_id(deal_id: str, current_user=Depends(get_current_user)):

    if not ObjectId.is_valid(deal_id):
        raise HTTPException(status_code=400, detail="Invalid deal id")

    deal = db.deals.find_one({"_id": ObjectId(deal_id)})

    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal["id"] = str(deal["_id"])
    deal.pop("_id", None)
    return deal

