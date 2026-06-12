"""
Password hashing helpers using bcrypt (via passlib).
Used only for the local user list; Google users go through Supabase.
"""
from __future__ import annotations

from passlib.context import CryptContext

# bcrypt with 12 rounds (OWASP 2024 recommendation for interactive web auth)
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)
