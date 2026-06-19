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
    echo "   PostgreSQL not ready â€” waiting..."
    sleep 2
done

echo "==> PostgreSQL is ready!"

# Run migrations
echo "==> Running Alembic migrations..."
alembic upgrade head

# Seed database
echo "==> Seeding database..."
python scripts/seed.py

# Start uvicorn in the background FIRST so token generator can call the API
echo "==> Starting Beacon API on http://0.0.0.0:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
UVICORN_PID=$!

# Generate agent token (calls the API, so uvicorn must be running)
echo "==> Generating agent token for dev agent..."
python scripts/generate_agent_token.py 2>/dev/null || echo "   (token generation skipped â€” will retry on agent startup)"

echo "==> Beacon is ready!"
echo "    Frontend: http://localhost:5173"
echo "    Backend:  http://localhost:8000"
echo "    API Docs: http://localhost:8000/docs"

# Wait for uvicorn to keep the container alive
wait $UVICORN_PID
