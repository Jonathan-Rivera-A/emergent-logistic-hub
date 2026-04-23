"""Pydantic schemas for auth endpoints — strict whitelisting of fields."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginPayload(BaseModel):
    """Local email/password login."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class GoogleExchangePayload(BaseModel):
    """Supabase access token coming from frontend after Google OAuth."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    access_token: str = Field(min_length=10, max_length=4096)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class UserInfo(BaseModel):
    email: EmailStr
    name: str | None = None
    provider: str  # 'local' | 'google'
    is_admin: bool = False
