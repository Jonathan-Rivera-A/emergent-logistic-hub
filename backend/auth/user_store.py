"""
User store backed by MongoDB.
Seeds a single admin account on first run (idempotent).

Schema of the 'users' collection:
    {
      email: str (unique index),
      name: str,
      password_hash: str | None,   # null for Google-only users
      provider: 'local' | 'google',
      is_admin: bool,
      created_at: iso8601 str,
    }
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from .hashing import hash_password

log = logging.getLogger(__name__)

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@forjatec.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "fojatec11553")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Administrador")


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.users.create_index("email", unique=True)


async def seed_admin(db: AsyncIOMotorDatabase) -> None:
    existing = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0, "email": 1})
    if existing:
        log.info("Auth seed: admin user already present")
        return
    await db.users.insert_one({
        "email": ADMIN_EMAIL,
        "name": ADMIN_NAME,
        "password_hash": hash_password(ADMIN_PASSWORD),
        "provider": "local",
        "is_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    log.info("Auth seed: admin user %s created", ADMIN_EMAIL)


async def get_user_by_email(
    db: AsyncIOMotorDatabase, email: str
) -> Optional[dict]:
    """Return user document (without _id) or None."""
    return await db.users.find_one({"email": email.lower()}, {"_id": 0})


async def upsert_google_user(
    db: AsyncIOMotorDatabase, email: str, name: Optional[str]
) -> dict:
    """Create or update a Google-provider user. Never sets password_hash."""
    email_l = email.lower()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "email": email_l,
        "name": name or email_l.split("@")[0],
        "provider": "google",
        "is_admin": False,
        "updated_at": now,
    }
    await db.users.update_one(
        {"email": email_l},
        {"$set": doc, "$setOnInsert": {"created_at": now, "password_hash": None}},
        upsert=True,
    )
    user = await db.users.find_one({"email": email_l}, {"_id": 0})
    return user or doc
