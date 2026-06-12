#!/usr/bin/env bash
# Bootstrap script — installs deps and seeds the admin user in one go.
# Usage: ./scripts/bootstrap.sh [local]
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Backend deps (pip)"
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created backend/.env from example — edit JWT_SECRET and SUPABASE_* before use"
fi

if [ ! -f data/telemetria.csv ]; then
  echo "WARN: backend/data/telemetria.csv missing — BI endpoints will return empty datasets"
fi

cd "$ROOT/frontend"
echo "==> Frontend deps (yarn or npm)"
if command -v yarn >/dev/null 2>&1; then
  yarn install
else
  npm install
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created frontend/.env from example — edit VITE_SUPABASE_* before Google OAuth works"
fi

echo ""
echo "==> Done. Start the servers with:"
echo "    Terminal 1 (backend):  cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo "    Terminal 2 (frontend): cd frontend && yarn dev   # or npm run dev"
echo ""
echo "Default admin: admin@forjatec.com / fojatec11553"
