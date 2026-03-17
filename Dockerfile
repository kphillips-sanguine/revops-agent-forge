# ==============================================================
# AgentForge — Sevalla Deployment (External PostgreSQL)
# ==============================================================

# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY agent-platform-ui/package.json agent-platform-ui/package-lock.json* ./
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps
COPY agent-platform-ui/ ./
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies (psql client for seed check)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY agent-platform-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY agent-platform-api/ .

# Copy frontend build into static/ directory for FastAPI to serve
COPY --from=frontend-build /frontend/dist ./static

# Copy startup script (sed fixes Windows CRLF line endings)
COPY scripts/startup.sh /app/startup.sh
RUN sed -i 's/\r$//' /app/startup.sh && chmod +x /app/startup.sh

EXPOSE ${PORT:-8000}

CMD ["/app/startup.sh"]
