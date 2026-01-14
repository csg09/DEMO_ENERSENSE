"""Application configuration using Pydantic settings."""

from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite+aiosqlite:///./smartsense.db"

    # JWT Configuration
    secret_key: str = "dev-secret-key-change-in-production-min-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    refresh_token_expire_days_remember: int = 30

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Session
    inactivity_timeout_minutes: int = 30

    # Environment
    environment: str = "development"
    debug: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
