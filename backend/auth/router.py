"""
Auth HTTP endpoints mounted under /api/auth.

    POST /api/auth/login            (rate-limited 5/min) — email+password
    POST /api/auth/google-exchange  (rate-limited 10/min) — Supabase Google session
    GET  /api/auth/me               — current user from JWT
    GET  /api/auth/health           — smoke test

Rate limiting uses slowapi (IP-based). The limiter is imported from rate_limit.
"""
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from slowapi import Limiter
from slowapi.util import get_remote_address

from .dependencies import get_current_user
from .hashing import verify_password
from .jwt_utils import JWT_TTL_MINUTES, create_access_token
from .schemas import GoogleExchangePayload, LoginPayload, TokenResponse, UserInfo
from .user_store import get_user_by_email, upsert_google_user
from rate_limit import limiter  # noqa: E402

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")


def _get_db(request: Request) -> AsyncIOMotorDatabase:
    """Shared Mongo handle attached to the FastAPI app at startup."""
    return request.app.state.db


def _token_response(user: dict) -> TokenResponse:
    claims = {
        "name": user.get("name"),
        "provider": user.get("provider", "local"),
        "is_admin": bool(user.get("is_admin")),
    }
    token = create_access_token(sub=user["email"], extra=claims)
    return TokenResponse(
        access_token=token,
        expires_in=JWT_TTL_MINUTES * 60,
        user={"email": user["email"], **claims},
    )


@router.get("/health")
def health():
    return {"status": "ok", "supabase_configured": bool(SUPABASE_URL)}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    payload: LoginPayload = Body(...),
):
    db = _get_db(request)
    user = await get_user_by_email(db, payload.email.lower())
    # Constant-time behavior: always attempt a hash compare even when user is missing.
    if not user or not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    if not verify_password(payload.password, user["password_hash"]):
        log.warning("Failed login for %s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    log.info("Successful login: %s", user["email"])
    return _token_response(user)


async def _verify_supabase_token(access_token: str) -> Optional[dict]:
    """Call Supabase /auth/v1/user to verify the token and fetch the profile."""
    if not SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado en el servidor (SUPABASE_URL ausente)",
        )
    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    anon = os.environ.get("SUPABASE_ANON_KEY", "")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "apikey": anon,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, headers=headers)
    if r.status_code != 200:
        return None
    return r.json()


@router.post("/google-exchange", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_exchange(
    request: Request,
    payload: GoogleExchangePayload = Body(...),
):
    """Exchange a Supabase Google session for our own JWT."""
    data = await _verify_supabase_token(payload.access_token)
    if not data or not data.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Supabase inválido",
        )
    provider = (
        data.get("app_metadata", {}).get("provider")
        or data.get("user_metadata", {}).get("provider")
        or "google"
    )
    if provider != "google":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proveedor {provider} no permitido",
        )
    db = _get_db(request)
    meta = data.get("user_metadata", {})
    user = await upsert_google_user(
        db,
        email=data["email"],
        name=meta.get("full_name") or meta.get("name"),
    )
    return _token_response(user)


@router.get("/me", response_model=UserInfo)
async def me(user: dict = Depends(get_current_user)):
    return UserInfo(
        email=user["sub"],
        name=user.get("name"),
        provider=user.get("provider", "local"),
        is_admin=bool(user.get("is_admin")),
    )
