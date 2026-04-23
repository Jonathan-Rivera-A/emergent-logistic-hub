#!/usr/bin/env bash
# Manual admin seeder — useful if you changed ADMIN_EMAIL/ADMIN_PASSWORD after first boot.
# Runs: python -m backend.auth.seed
set -e
cd "$(dirname "$0")/.."

python -c "
import asyncio, os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from motor.motor_asyncio import AsyncIOMotorClient
from backend.auth.user_store import ensure_indexes, seed_admin

async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    await ensure_indexes(db)
    await seed_admin(db)
    print('OK')

asyncio.run(main())
"
