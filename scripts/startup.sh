#!/bin/bash
set -e

echo "=== AgentForge Startup ==="

# ─────────────────────────────────────────────
# Mode: External DB (DATABASE_URL set) or Local Embedded PostgreSQL
# ─────────────────────────────────────────────

if [ -z "$DATABASE_URL" ]; then
    echo "No DATABASE_URL set — starting embedded PostgreSQL..."

    DB_USER="agentforge"
    DB_NAME="agentforge"
    DB_PASSWORD="${DB_PASSWORD:-agentforge-local}"
    PGDATA="/var/lib/postgresql/data"

    # Initialize PostgreSQL if not already done
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
        echo "Initializing PostgreSQL data directory..."
        su - postgres -c "/usr/lib/postgresql/17/bin/initdb -D $PGDATA --encoding=UTF8 --locale=C"

        # Configure pg_hba for local password auth
        echo "host all all 127.0.0.1/32 md5" >> "$PGDATA/pg_hba.conf"
        echo "local all all trust" >> "$PGDATA/pg_hba.conf"
    fi

    # Start PostgreSQL temporarily to create DB/user
    echo "Starting PostgreSQL for setup..."
    su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA -l /tmp/pg_setup.log start -w -t 30"

    # Create user and database if they don't exist
    su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'\"" | grep -q 1 || \
        su - postgres -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\""

    su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\"" | grep -q 1 || \
        su - postgres -c "psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""

    # Stop temp PostgreSQL — supervisor will manage it
    su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PGDATA stop -w"

    export DATABASE_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
    export DB_HOST="127.0.0.1"
    export DB_USER
    export DB_NAME
    export DB_PASSWORD

    USE_SUPERVISOR=true
else
    echo "External DATABASE_URL detected — using remote database."
    USE_SUPERVISOR=false
fi

# ─────────────────────────────────────────────
# Set defaults for env vars
# ─────────────────────────────────────────────
export ENVIRONMENT="${ENVIRONMENT:-production}"
export JWT_SECRET="${JWT_SECRET:-change-me-in-production}"

# Build CORS origins: always include the Sevalla URL if set
SEVALLA_URL="${SEVALLA_URL:-}"
if [ -n "$SEVALLA_URL" ]; then
    export CORS_ORIGINS="[\"${SEVALLA_URL}\", \"http://localhost:8000\"]"
else
    export CORS_ORIGINS="${CORS_ORIGINS:-[\"*\"]}"
fi

# ─────────────────────────────────────────────
# Run with supervisor (embedded PG) or directly
# ─────────────────────────────────────────────

if [ "$USE_SUPERVISOR" = true ]; then
    # Start supervisor (starts PostgreSQL, then we run migrations, then start app)
    echo "Starting PostgreSQL via supervisor..."
    supervisord -c /etc/supervisor/conf.d/agentforge.conf &
    SUPERVISOR_PID=$!

    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL..."
    for i in $(seq 1 30); do
        if pg_isready -h 127.0.0.1 -p 5432 -U agentforge 2>/dev/null; then
            echo "PostgreSQL is ready!"
            break
        fi
        sleep 1
    done

    if ! pg_isready -h 127.0.0.1 -p 5432 -U agentforge 2>/dev/null; then
        echo "ERROR: PostgreSQL failed to start within 30 seconds"
        exit 1
    fi

    # Run migrations
    echo "Running Alembic migrations..."
    alembic upgrade head

    # Seed if empty
    PGPASSWORD="${DB_PASSWORD}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -q "^0$" && {
        echo "Database is empty, running seed script..."
        python -m scripts.seed
    } || echo "Database already seeded, skipping."

    # Now start the app via supervisor
    echo "Starting AgentForge API..."
    supervisorctl -c /etc/supervisor/conf.d/agentforge.conf start agentforge

    # Keep the container alive
    wait $SUPERVISOR_PID
else
    # External DB mode — just run migrations + app directly
    echo "Running Alembic migrations..."
    alembic upgrade head

    # Seed if needed (requires DB_HOST, DB_USER, DB_NAME, DB_PASSWORD env vars)
    if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -q "^0$" && {
            echo "Database is empty, running seed script..."
            python -m scripts.seed
        } || echo "Database already seeded, skipping."
    fi

    echo "Starting AgentForge API..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
fi
