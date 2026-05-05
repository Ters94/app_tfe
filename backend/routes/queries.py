from http.client import HTTPException

from fastapi import APIRouter, Depends
from backend.database import db
from backend.routes import groups, membership
from backend.models import membership
from backend.security import get_current_user
from backend.models.query import Query, QueryCreate
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/queries", tags=["Queries"])


@router.post("/")
def create_query(query: QueryCreate, current_user=Depends(get_current_user)):

    query_dict = query.model_dump()
    query_dict["created_by"] = ObjectId(current_user)
    query_dict["group_id"] = ObjectId(query.group_id)
    query_dict["created_at"] = datetime.utcnow()

    result = db.queries.insert_one(query_dict)

    return {
         "id": str(result.inserted_id),
        "query_name": query_dict["query_name"],
        "filters": query_dict["filters"],
        "group_id": str(query_dict["group_id"]),
        "created_by": str(query_dict["created_by"]),
        "created_at": query_dict["created_at"],
        "data_fields": query_dict.get("data_fields", [])
    }

@router.get("/")
def get_queries(current_user=Depends(get_current_user)):
    queries = []

    for query in db.queries.find():

        group_id = query.get("group_id")

        membership = db.memberships.find_one({
            "user_id": ObjectId(current_user),
            "group_id": group_id
        })
       

        group = db.groups.find_one({"_id": group_id})
        is_owner = group and str(group.get("owner_id")) == str(current_user)
        is_member = membership is not None
        queries.append({
            "id": str(query["_id"]),
            "query_name": query.get("query_name"),
            "filters": query.get("filters", {}),
            "group_id": str(query.get("group_id")),
            "created_by": str(query.get("created_by")),
            "created_at": query.get("created_at"),
            "can_manage": is_owner or is_member
        })

    return queries

@router.get("/{query_id}/execute")
def execute_query(query_id: str, current_user=Depends(get_current_user)):

    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    query = db.queries.find_one({"_id": ObjectId(query_id)})

    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    filters = query.get("filters", {})

    deals_cursor = db.deals.find(filters)

    results = []

    for deal in deals_cursor:
        results.append({
            "id": str(deal["_id"]),
            "type": deal.get("type"),
            "product": deal.get("product"),
            "delivery_date": deal.get("delivery_date"),
            "amount": deal.get("amount"),
            "volume": deal.get("volume")
        })

    return {
        "query_id": str(query["_id"]),
        "query_name": query.get("query_name"),
        "filters": filters,
        "results_count": len(results),
        "results": results
    }

@router.get("/{query_id}")
def get_query_by_id(query_id: str, current_user=Depends(get_current_user)):
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
        "created_by": str(query.get("created_by"))
    }

@router.put("/{query_id}")
def update_query(query_id: str, query: QueryCreate, current_user=Depends(get_current_user)):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    result = db.queries.update_one(
        {"_id": ObjectId(query_id)},
        {
            "$set": {
                "query_name": query.query_name,
                "filters": query.filters,
                "group_id": ObjectId(query.group_id)
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")

    return {"message": "Query updated"}


@router.delete("/{query_id}")
def delete_query(query_id: str, current_user=Depends(get_current_user)):
    result = db.queries.delete_one({"_id": ObjectId(query_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")

    return {"message": "Query deleted"}

@router.get("/group/{group_id}")
def get_queries_by_group(group_id: str, current_user=Depends(get_current_user)):
    queries = []

    for query in db.queries.find({"group_id": ObjectId(group_id)}):
        queries.append({
            "id": str(query["_id"]),
            "query_name": query.get("query_name"),
            "filters": query.get("filters", {}),
            "group_id": str(query.get("group_id")),
            "created_by": str(query.get("created_by"))
        })

    return queries