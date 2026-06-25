import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from jose import JWTError
from backend.models import user
from backend.security import (
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    get_password_hash,
)
from fastapi.security import OAuth2PasswordRequestForm


from backend.database import db
from backend.config import settings
from backend.services.email_service import send_email

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.users.find_one({"email": form_data.username})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token({"sub": str(user["_id"])})
    return {
    "access_token": token,
    "token_type": "bearer"
    }


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    user = db.users.find_one({"email": data.email})
    if user:
        token = create_password_reset_token(str(user["_id"]))
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
        try:
            full_name = f"{user.get('name', '')} {user.get('lastname', '')}".strip() or user.get("username", "")
            subject = f"[{settings.APP_NAME}] Réinitialisation de votre mot de passe"
            body = (
                f"Bonjour {full_name},\n\n"
                f"Vous avez demandé la réinitialisation de votre mot de passe.\n"
                f"Cliquez sur le lien ci-dessous (valable 30 minutes) :\n\n"
                f"{reset_link}\n\n"
                f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n"
                f"Cordialement,\nL'équipe {settings.APP_NAME}\n"
            )
            send_email(user["email"], subject, body)
        except Exception as e:
            logger.error(f"Echec envoi email reset a {data.email} : {e}")
    return {"message": "Si un compte existe, un email a été envoyé."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères.")
    try:
        user_id = verify_password_reset_token(data.token)
    except JWTError:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré.")

    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": get_password_hash(data.new_password)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré.")
    return {"message": "Mot de passe réinitialisé avec succès."}

