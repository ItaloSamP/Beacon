FROM python:3.13-slim

WORKDIR /app

# System dependencies for psycopg2/asyncpg build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install root project dependencies first (layer caching)
# Create minimal app package so setuptools can discover it for editable install
# (full app/ code comes later via COPY + bind mount)
COPY pyproject.toml requirements.txt ./
RUN mkdir -p app && touch app/__init__.py
RUN pip install --no-cache-dir -e ".[dev]"

# Copy and install agent package (layer cached on agent/ changes)
COPY agent/ ./agent/
RUN pip install --no-cache-dir ./agent/

# Copy application code (changes frequently — cached layers above reused)
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY scripts/ ./scripts/

# Make entrypoint executable
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
