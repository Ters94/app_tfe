from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    
    MONGO_URI = os.getenv("MONGO_URI")
    DATABASE_NAME = os.getenv("DATABASE_NAME")

    
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60))


    SMTP_HOST       = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT       = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER       = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD   = os.getenv("SMTP_PASSWORD", "")

    APP_NAME        = os.getenv("APP_NAME", "ENGIE Queries")

    FRONTEND_URL    = os.getenv("FRONTEND_URL", "http://localhost:4200")

settings = Settings()
