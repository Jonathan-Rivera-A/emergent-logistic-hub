"""Authentication package: JWT-based login + Supabase Google exchange."""
from .router import router as auth_router
from .dependencies import get_current_user

__all__ = ["auth_router", "get_current_user"]
