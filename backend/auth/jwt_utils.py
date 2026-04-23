"""
JWT token issuing and verification.

Two entry points:
- `create_access_token(sub, extra)` — issues an HS256 JWT signed with JWT_SECRET.
- `decode_token(token)` — verifies signature and returns the claims dict.

Tokens include: sub (user email), name, provider ('local'|'google'), exp, iat.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_TTL_MINUTES = int(os.environ.get("JWT_TTL_MINUTES", "720"))  # 12 hours


class TokenError(Exception):
    """Raised on malformed or expired tokens."""


def create_access_token(sub: str, extra: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_TTL_MINUTES)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise TokenError(str(e)) from e
