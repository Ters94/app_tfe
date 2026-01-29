from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from backend.security import verify_password


from backend.database import db
from backend.security import verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(data: LoginRequest):
    user = db.users.find_one({"email": data.email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    return {
        "message": "Login successful",
        "user_id": str(user["_id"])
    }
