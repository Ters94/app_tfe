from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    
    MONGO_URI = os.getenv("MONGO_URI")
    DATABASE_NAME = os.getenv("DATABASE_NAME")

    
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    #les variables d'environnement sont toujours des chaînes de caractères, donc on convertit en int
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60))


settings = Settings()
