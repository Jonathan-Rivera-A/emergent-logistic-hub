"""
Sistema de Transporte — FastAPI backend.

Wires:
- Auth (JWT + Supabase Google exchange) under /api/auth
- Business Intelligence telemetry API under /api/bi (protected, rate-limited 60/min)
- Status ping under /api/status
- MongoDB (Motor async) + admin seed on startup
- SlowAPI global rate limiter
- Strict CORS from CORS_ORIGINS env
"""
from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import APIRouter, Depends, FastAPI, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.cors import CORSMiddleware

from auth import auth_router, get_current_user
from auth.user_store import ensure_indexes, seed_admin
from bi import bi_router
from rate_limit import limiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("server")

mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = db
    await ensure_indexes(db)
    await seed_admin(db)
    # Preload telemetry CSV so first BI request is fast
    from bi.data_loader import get_points, get_route_summary
    pts, routes = get_points(), get_route_summary()
    logger.info("BI: %d points / %d routes ready in memory", len(pts), len(routes))
    yield
    mongo_client.close()


app = FastAPI(title="Sistema de Transporte — Secure API", lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# --------- Legacy status check (public, low-priority) ---------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str = Field(min_length=1, max_length=100)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    client_name: str = Field(min_length=1, max_length=100)


api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "Sistema de Transporte — Secure API", "ok": True}


@api.post("/status", response_model=StatusCheck)
@limiter.limit("30/minute")
async def create_status_check(request: Request, payload: StatusCheckCreate):
    obj = StatusCheck(**payload.model_dump())
    doc = obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return obj


@api.get("/status", response_model=List[StatusCheck])
async def list_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get("timestamp"), str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
    return rows


app.include_router(api)
app.include_router(auth_router)

# BI router — gated by JWT (60/min rate limits declared per endpoint)
app.include_router(
    bi_router,
    dependencies=[Depends(get_current_user)],
)
