from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(REPO_ROOT / ".env"),
            str(REPO_ROOT / ".env.local"),
            ".env",
            ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Anime Tracker API"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://anime:securepassword@localhost:5432/anime"
    anilist_api_url: str = "https://graphql.anilist.co"
    openrouter_api_url: str = "https://openrouter.ai/api/v1/chat/completions"
    openrouter_api_key: Optional[SecretStr] = None
    openrouter_model: str = "google/gemma-4-31b-it:free,nvidia/nemotron-3.5-lightning:free,liquid/lfm-2.5-2.6b:free"
    frontend_url: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
