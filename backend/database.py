from pymongo import MongoClient
from backend.config import settings

client = MongoClient(settings.MONGO_URI)
db = client[settings.DATABASE_NAME]

def get_users_collection():
    return db["users"]

def get_groups_collection():
    return db["groups"]
