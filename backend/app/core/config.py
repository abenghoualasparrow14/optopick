# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "OptoPick"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Base de données
    DATABASE_URL: str = "sqlite:///./optopick.db"

    # Sécurité JWT
    SECRET_KEY: str = "changez-moi-en-production-cle-tres-secrete"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 heures

    # Upload
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: list[str] = [".csv", ".xlsx", ".xls"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
