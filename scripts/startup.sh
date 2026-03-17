#!/bin/bash
set -e

echo "=== AgentForge Startup ==="

# ─────────────────────────────────────────────
# Debug: show which env vars are set (redacted values)
# ─────────────────────────────────────────────
echo "Environment check:"
echo "  DATABASE_URL: ${DATABASE_URL:+SET ($(echo $DATABASE_URL | cut -c1-30)...)}${DATABASE_URL:-NOT SET}"
echo "  DB_HOST: ${DB_HOST:-NOT SET}"
echo "  DB_USER: ${DB_USER:-NOT SET}"
echo "  DB_NAME: ${DB_NAME:-NOT SET}"
echo "  DB_PASSWORD: ${DB_PASSWORD:+SET}${DB_PASSWORD:-NOT SET}"
echo "  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+SET}${ANTHROPIC_API_KEY:-NOT SET}"
echo "  JWT_SECRET: ${JWT_SECRET:+SET}${JWT_SECRET:-NOT SET}"
echo "  ENVIRONMENT: ${ENVIRONMENT:-NOT SET}"

# ─────────────────────────────────────────────
# Validate required env vars
# ─────────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is required."
    echo "Expected format: postgresql+asyncpg://user:pass@host:5432/dbname"
    echo "Set this as an environment variable in Sevalla secrets."
    exit 1
fi

export ENVIRONMENT="${ENVIRONMENT:-production}"
export JWT_SECRET="${JWT_SECRET:-change-me-in-production}"

# CORS: allow Sevalla URL + localhost
SEVALLA_URL="${SEVALLA_URL:-}"
if [ -n "$SEVALLA_URL" ]; then
    export CORS_ORIGINS="[\"${SEVALLA_URL}\", \"http://localhost:8000\"]"
else
    export CORS_ORIGINS="${CORS_ORIGINS:-[\"*\"]}"
fi

# ─────────────────────────────────────────────
# Wait for PostgreSQL to be reachable
# ─────────────────────────────────────────────
if [ -n "$DB_HOST" ]; then
    echo "Waiting for PostgreSQL at ${DB_HOST}:5432..."
    for i in $(seq 1 30); do
        if pg_isready -h "$DB_HOST" -p 5432 -U "${DB_USER:-postgres}" 2>/dev/null; then
            echo "PostgreSQL is ready!"
            break
        fi
        echo "  ...attempt $i/30"
        sleep 2
    done
fi

# ─────────────────────────────────────────────
# Run Alembic migrations
# ─────────────────────────────────────────────
echo "Running Alembic migrations..."
alembic upgrade head

# ─────────────────────────────────────────────
# Seed database if empty
# ─────────────────────────────────────────────
if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
    SEED_CHECK=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "error")

    if [ "$SEED_CHECK" = "0" ]; then
        echo "Database is empty, running seed script..."
        python -m scripts.seed
    elif [ "$SEED_CHECK" = "error" ]; then
        echo "WARNING: Could not check seed status (table may not exist yet). Attempting seed..."
        python -m scripts.seed || echo "Seed failed (may already be seeded)"
    else
        echo "Database already seeded ($SEED_CHECK users), skipping."
    fi
else
    echo "WARNING: DB_HOST/DB_USER/DB_NAME not set — skipping seed check."
    echo "Attempting seed anyway..."
    python -m scripts.seed || echo "Seed skipped (may already be seeded)"
fi

# ─────────────────────────────────────────────
# Start the app
# ─────────────────────────────────────────────
APP_PORT="${PORT:-8000}"
echo "Starting AgentForge API on port ${APP_PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT}" --workers 2
