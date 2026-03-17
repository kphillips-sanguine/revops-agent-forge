#!/bin/sh
set -e

echo "=== AgentForge Startup ==="

# Run database migrations
echo "Running Alembic migrations..."
alembic upgrade head

# Seed database if empty (check if users table has any rows)
PGPASSWORD="${DB_PASSWORD:-localdev}" psql -h "${DB_HOST:-db}" -U "${DB_USER:-agentforge}" -d "${DB_NAME:-agentforge}" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -q "^0$" && {
    echo "Database is empty, running seed script..."
    python -m scripts.seed
} || echo "Database already seeded, skipping."

# Start uvicorn
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
