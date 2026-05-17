#!/bin/bash
set -e

echo "==> Beacon Backend Entrypoint"
echo "==> Waiting for PostgreSQL at ${DATABASE_URL}..."

# Wait for PostgreSQL to be ready
until python -c "
import asyncpg, asyncio, os, sys
async def check():
    try:
        conn = await asyncpg.connect(os.environ['DATABASE_URL'].replace('+asyncpg',''))
        await conn.close()
        return True
    except Exception:
        return False
if not asyncio.run(check()):
    sys.exit(1)
" 2>/dev/null; do
    echo "   PostgreSQL not ready — waiting..."
    sleep 2
done

echo "==> PostgreSQL is ready!"

# Run migrations
echo "==> Running Alembic migrations..."
alembic upgrade head

# Seed database
echo "==> Seeding database..."
python scripts/seed.py

# Generate agent token for local dev agent
echo "==> Generating agent token for dev agent..."
python scripts/generate_agent_token.py 2>/dev/null || echo "   (token generation skipped — will retry on agent startup)"

echo "==> Starting Beacon API on http://0.0.0.0:8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
