from fastapi import APIRouter, Depends, HTTPException
from backend.database import db
from backend.security import get_current_user
from backend.models.query import QueryCreate
from backend.services.audit_service import create_audit
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/queries", tags=["Queries"])


def is_admin(user_id: str) -> bool:
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return user is not None and user.get("role") == "ADMIN"


def build_deal_filter(filters: dict):
    mongo_filter = {}

    for key, value in filters.items():
        if value in [None, ""]:
            continue

        if key == "start_date":
            mongo_filter["delivery_date"] = mongo_filter.get("delivery_date", {})
            mongo_filter["delivery_date"]["$gte"] = value + "T00:00:00Z"

        elif key == "end_date":
            mongo_filter["delivery_date"] = mongo_filter.get("delivery_date", {})
            mongo_filter["delivery_date"]["$lte"] = value + "T23:59:59Z"

        elif key == "price_min":
            mongo_filter["price"] = mongo_filter.get("price", {})
            mongo_filter["price"]["$gte"] = float(value)

        elif key == "price_max":
            mongo_filter["price"] = mongo_filter.get("price", {})
            mongo_filter["price"]["$lte"] = float(value)

        elif key == "volume_min":
            mongo_filter["volume"] = mongo_filter.get("volume", {})
            mongo_filter["volume"]["$gte"] = float(value)

        elif key == "volume_max":
            mongo_filter["volume"] = mongo_filter.get("volume", {})
            mongo_filter["volume"]["$lte"] = float(value)

        else:
            mongo_filter[key] = value

    return mongo_filter


@router.post("/")
def create_query(query: QueryCreate, current_user=Depends(get_current_user)):
    if is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Les administrateurs ne peuvent pas créer de queries."
        )

    if not ObjectId.is_valid(query.group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    group = db.groups.find_one({"_id": ObjectId(query.group_id), "status": True})

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    membership = db.memberships.find_one({
        "group_id": query.group_id,
        "user_id": current_user
    })

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Vous devez être membre du groupe pour créer une query."
        )

    query_dict = query.model_dump()
    query_dict["created_by"] = ObjectId(current_user)
    query_dict["group_id"] = ObjectId(query.group_id)
    query_dict["created_at"] = datetime.utcnow()

    selected_fields = query_dict.get("selected_fields", {})

    result = db.queries.insert_one(query_dict)
    query_id = str(result.inserted_id)

    create_audit(
        action="CREATE_QUERY",
        target_type="QUERY",
        current_user=current_user,
        group_id=query.group_id,
        target_id=query_id,
        target_label=query.query_name,
        old_values=None,
        new_values={
            "query_name": query.query_name,
            "filters": query.filters,
            "group_name": group.get("name"),
            "selected_fields": selected_fields
        }
    )

    return {
        "id": query_id,
        "query_name": query_dict["query_name"],
        "filters": query_dict["filters"],
        "group_id": str(query_dict["group_id"]),
        "created_by": str(query_dict["created_by"]),
        "created_at": query_dict["created_at"],
        "selected_fields": selected_fields
    }


@router.get("/")
def get_queries(current_user=Depends(get_current_user)):
    queries = []

    for query in db.queries.find():
        group_id = query.get("group_id")

        membership = db.memberships.find_one({
            "user_id": current_user,
            "group_id": str(group_id)
        })

        group = db.groups.find_one({"_id": group_id})

        is_owner = group and str(group.get("owner_id")) == str(current_user)
        is_member = membership is not None

        queries.append({
            "id": str(query["_id"]),
            "query_name": query.get("query_name"),
            "filters": query.get("filters", {}),
            "group_id": str(group_id),
            "created_by": str(query.get("created_by")),
            "created_at": query.get("created_at"),
            "can_manage": is_owner or is_member
        })

    return queries


@router.get("/group/{group_id}")
def get_queries_by_group(group_id: str, current_user=Depends(get_current_user)):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group id")

    queries = []

    for query in db.queries.find({"group_id": ObjectId(group_id)}):
        queries.append({
            "id": str(query["_id"]),
            "query_name": query.get("query_name"),
            "filters": query.get("filters", {}),
            "group_id": str(query.get("group_id")),
            "created_by": str(query.get("created_by")),
            "selected_fields": query.get("selected_fields", {})
        })

    return queries


@router.get("/{query_id}/execute")
def execute_query(query_id: str, current_user=Depends(get_current_user)):
    if is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Les administrateurs ne peuvent pas exécuter de queries."
        )

    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    query = db.queries.find_one({"_id": ObjectId(query_id)})

    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    group_id = str(query.get("group_id"))

    membership = db.memberships.find_one({
        "group_id": group_id,
        "user_id": current_user
    })

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Vous devez être membre du groupe pour exécuter cette query."
        )

    filters = query.get("filters", {})
    mongo_filter = build_deal_filter(filters)

    deals_cursor = db.deals.find(mongo_filter).sort([
        ("trade_date", 1),
        ("delivery_date", 1),
        ("deal_id", 1)
    ])

    results = []
    total_volume = 0
    total_amount = 0

    for deal in deals_cursor:
        volume = deal.get("volume", 0) or 0
        amount = deal.get("amount", 0) or 0

        total_volume += volume
        total_amount += amount

        results.append({
            "id": str(deal["_id"]),
            "deal_id": deal.get("deal_id"),
            "deal_type": deal.get("deal_type"),
            "product": deal.get("product"),
            "portfolio": deal.get("portfolio"),
            "desk": deal.get("desk"),
            "entity": deal.get("entity"),
            "direction": deal.get("direction"),
            "trader_code": deal.get("trader_code"),
            "counterparty_name": deal.get("counterparty_name"),
            "business_unit": deal.get("business_unit"),
            "trade_date": deal.get("trade_date"),
            "delivery_date": deal.get("delivery_date"),
            "volume": volume,
            "quantity_unit": deal.get("quantity_unit"),
            "amount": amount,
            "price": deal.get("price"),
            "open_quantity": deal.get("open_quantity"),
            "cash": deal.get("cash"),
            "margin_cost": deal.get("margin_cost"),
            "total_margin_cost": deal.get("total_margin_cost"),
            "delivery_point": deal.get("delivery_point"),
            "delivery_type": deal.get("delivery_type"),
            "transport_corridor": deal.get("transport_corridor"),
            "booking_status": deal.get("booking_status")
        })

    average_price = 0

    if total_volume > 0:
        average_price = round(total_amount / total_volume, 2)

    return {
        "query_id": str(query["_id"]),
        "query_name": query.get("query_name"),
        "filters": filters,
        "filters_used": mongo_filter,
        "results_count": len(results),
        "total_volume": total_volume,
        "total_amount": total_amount,
        "average_price": average_price,
        "results": results
    }


@router.get("/{query_id}")
def get_query_by_id(query_id: str, current_user=Depends(get_current_user)):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    query = db.queries.find_one({"_id": ObjectId(query_id)})

    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    group = db.groups.find_one({"_id": query.get("group_id")})

    return {
        "id": str(query["_id"]),
        "query_name": query.get("query_name"),
        "filters": query.get("filters", {}),
        "group_id": str(query.get("group_id")),
        "group_name": group.get("name") if group else "—",
        "created_by": str(query.get("created_by")),
        "selected_fields": query.get("selected_fields", {})
    }


@router.put("/{query_id}")
def update_query(
    query_id: str,
    query: QueryCreate,
    current_user=Depends(get_current_user)
):
    if is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Les administrateurs ne peuvent pas modifier de queries."
        )

    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    old_query = db.queries.find_one({"_id": ObjectId(query_id)})

    if not old_query:
        raise HTTPException(status_code=404, detail="Query not found")

    old_group_id = old_query.get("group_id")
    old_group_id_str = str(old_group_id)

    group = db.groups.find_one({"_id": old_group_id})

    membership = db.memberships.find_one({
        "group_id": old_group_id_str,
        "user_id": current_user
    })

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Vous devez être membre du groupe pour modifier cette query."
        )

    old_product = old_query.get("filters", {}).get("product")
    new_product = query.filters.get("product")

    if old_product and new_product and old_product != new_product:
        raise HTTPException(
            status_code=400,
            detail="Le produit d'une query ne peut pas être modifié."
        )

    selected_fields = query.selected_fields or {}

    old_values = {
        "query_name": old_query.get("query_name"),
        "filters": old_query.get("filters"),
        "group_name": group.get("name") if group else "Unknown",
        "selected_fields": old_query.get("selected_fields", {})
    }

    new_values = {
        "query_name": query.query_name,
        "filters": query.filters,
        "group_name": group.get("name") if group else "Unknown",
        "selected_fields": selected_fields
    }

    db.queries.update_one(
        {"_id": ObjectId(query_id)},
        {
            "$set": {
                "query_name": query.query_name,
                "filters": query.filters,
                "selected_fields": selected_fields
            }
        }
    )

    create_audit(
        action="UPDATE_QUERY",
        target_type="QUERY",
        current_user=current_user,
        group_id=old_group_id_str,
        target_id=query_id,
        target_label=query.query_name,
        old_values=old_values,
        new_values=new_values
    )

    return {
        "message": "Query updated successfully"
    }


@router.delete("/{query_id}")
def delete_query(query_id: str, current_user=Depends(get_current_user)):
    if is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Les administrateurs ne peuvent pas supprimer de queries."
        )

    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    old_query = db.queries.find_one({"_id": ObjectId(query_id)})

    if not old_query:
        raise HTTPException(status_code=404, detail="Query not found")

    old_group_id = old_query.get("group_id")
    old_group_id_str = str(old_group_id)

    group = db.groups.find_one({"_id": old_group_id})

    membership = db.memberships.find_one({
        "group_id": old_group_id_str,
        "user_id": current_user
    })

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Vous devez être membre du groupe pour supprimer cette query."
        )

    old_values = {
        "query_name": old_query.get("query_name"),
        "filters": old_query.get("filters"),
        "group_name": group.get("name") if group else "Unknown",
        "selected_fields": old_query.get("selected_fields", {})
    }

    result = db.queries.delete_one({"_id": ObjectId(query_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")

    create_audit(
        action="DELETE_QUERY",
        target_type="QUERY",
        current_user=current_user,
        group_id=old_group_id_str,
        target_id=query_id,
        target_label=old_query.get("query_name"),
        old_values=old_values,
        new_values=None
    )

    return {
        "message": "Query deleted"
    }