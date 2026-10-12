from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api import anime_ask, anime_entries, catalog, recommendations
from app.core.config import get_settings
from app.db.session import check_database, engine

logger = structlog.get_logger()
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("api_started", environment=settings.environment)
    yield
    await catalog.client.close()
    await catalog.werstreamt_client.close()
    await recommendations.service.client.close()
    await engine.dispose()


cors_origins = [settings.frontend_url]
if settings.environment == "development":
    if "http://localhost:3000" not in cors_origins:
        cors_origins.append("http://localhost:3000")
    if "http://127.0.0.1:3000" not in cors_origins:
        cors_origins.append("http://127.0.0.1:3000")

app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(anime_entries.router)
app.include_router(catalog.router)
app.include_router(anime_ask.router)
app.include_router(recommendations.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
async def database_health() -> dict[str, str]:
    if not await check_database(engine):
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok"}
