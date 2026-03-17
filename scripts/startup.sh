#!/bin/bash
set -e

echo "=== AgentForge Startup ==="

# ─────────────────────────────────────────────
# Validate required env vars
# ─────────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is required"
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
echo "Starting AgentForge API on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
