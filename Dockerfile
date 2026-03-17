# ==============================================================
# AgentForge — Single-container deployment (App + PostgreSQL)
# ==============================================================

# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY agent-platform-ui/package.json agent-platform-ui/package-lock.json* ./
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps
COPY agent-platform-ui/ ./
RUN npm run build

# Stage 2: Python backend + PostgreSQL + serve frontend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies (PostgreSQL server + client + supervisor)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-client \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY agent-platform-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY agent-platform-api/ .

# Copy frontend build into static/ directory for FastAPI to serve
COPY --from=frontend-build /frontend/dist ./static

# Copy deployment scripts
COPY scripts/startup.sh /app/startup.sh
COPY scripts/supervisord.conf /etc/supervisor/conf.d/agentforge.conf
RUN chmod +x /app/startup.sh

# Create PostgreSQL data directory with correct permissions
RUN mkdir -p /var/lib/postgresql/data /run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql

# Expose port (Sevalla routes traffic to this port)
EXPOSE 8000

CMD ["/app/startup.sh"]
