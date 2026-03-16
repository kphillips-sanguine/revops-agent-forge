# AgentForge

Internal AI Agent Platform for Sanguine Bio. Empowers business users to create, manage, and deploy governed AI agents through a natural language interface.

## Architecture

- **Frontend:** React + TypeScript + Vite (`agent-platform-ui/`)
- **Backend API:** Python FastAPI (`agent-platform-api/`)
- **Database:** PostgreSQL 16
- **Orchestration:** n8n (external)
- **Agent Runtime:** Claude Agent SDK (Python)

## Quick Start

```bash
# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# Frontend: http://localhost:5173
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Project Structure

```
agent-platform/
├── agent-platform-ui/     # React frontend
├── agent-platform-api/    # FastAPI backend + agent runtime
├── scripts/               # Utility scripts
├── n8n/                   # n8n workflow exports
├── docs/                  # Documentation
├── docker-compose.yml     # Local development
├── PLAN.md                # Full implementation plan
└── FRONTEND_PHASES.md     # Frontend build phases
```

## Documentation

- [Implementation Plan](PLAN.md)
- [Frontend Build Phases](FRONTEND_PHASES.md)
