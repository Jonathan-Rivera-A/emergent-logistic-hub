"""FastAPI dependency to extract + validate the current user from Bearer JWT."""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .jwt_utils import TokenError, decode_token

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """Return the JWT claims dict. Raises 401 on any validation failure."""
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = decode_token(creds.credentials)
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    request.state.user = claims
    return claims


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user
