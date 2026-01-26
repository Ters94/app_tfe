from fastapi import FastAPI
from backend.database import client
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        client.admin.command("ping")
        print("Connected to MongoDB")
        yield
    finally:
        client.close()
        print("MongoDB connection closed")


app = FastAPI(
    title="TFE Backend API",
    description="API backend du projet TFE",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/")
def root():
    return {"message": "API is running correctly"}
