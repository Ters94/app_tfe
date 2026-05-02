from fastapi import FastAPI
from backend.database import client
from contextlib import asynccontextmanager
from backend.routes.users import router as users_router
from backend.routes.auth import router as auth_router
from backend.routes.groups import router as groups_router
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.membership import router as membership_router
from backend.routes.audits import router as audits_router
from backend.routes import deals
from backend.routes import queries



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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200","http://127.0.0.1:4200"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(membership_router)
app.include_router(audits_router)
app.include_router(deals.router)
app.include_router(queries.router)
@app.get("/")
def root():
    return {"message": "API is running correctly"}
