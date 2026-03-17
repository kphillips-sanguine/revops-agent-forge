Read PLAN.md and BACKEND_PHASES.md in this directory. Execute Phase B6 from BACKEND_PHASES.md.

Phases B1-B5 are complete. The full backend and frontend are built. This is the FINAL phase — governance, Docker, and polish.

Build on top of the existing code. Do NOT re-create existing files unless modifying them.

Do NOT ask questions — make decisions and build.

Key requirements:

1. RBAC enforcement — update all router endpoints to check user roles:
   - user: create + edit own agents only
   - reviewer: approve/reject
   - admin: activate/disable
   - revops: everything including tool management
   - Use the existing require_role dependency

2. Audit log endpoints:
   - GET /api/audit/ — list audit entries with filters (entity_type, entity_id, actor, date range)
   - GET /api/audit/{entity_type}/{entity_id} — audit trail for specific entity

3. Dashboard stats endpoint:
   - GET /api/stats/overview — returns active_agents count, pending_review count, executions_this_week count, estimated_cost_this_week

4. Production Dockerfile (update existing agent-platform-api/Dockerfile):
   - Multi-stage build: Stage 1 builds frontend (node:22-alpine), Stage 2 runs backend (python:3.12-slim)
   - Copy frontend dist into backend static/ directory
   - FastAPI serves frontend static files (mount StaticFiles)
   - Startup script: alembic upgrade head → seed data if empty → uvicorn
   - Put the Dockerfile in the project ROOT (not in agent-platform-api/)

5. Update docker-compose.yml in project root:
   - db service (postgres:16-alpine) with healthcheck
   - api service building from root Dockerfile, depends on db
   - Environment variables from .env
   - Single service serves both API and frontend

6. Create scripts/startup.sh:
   - Run alembic upgrade head
   - Run seed script if database is empty
   - Start uvicorn

7. Frontend error handling polish:
   - Ensure all pages handle API errors gracefully with toast notifications
   - 404 page component for invalid routes
   - Add it to App.tsx routes

8. Verify the FULL STACK works:
   - docker-compose build
   - Ensure Dockerfile builds without errors
   - npm run build (frontend) — zero TS errors
   - python -m uvicorn app.main:app (backend) — starts clean

When completely finished and verified working, run this exact command:
```
openclaw system event --text "B6 Complete: RBAC, audit endpoints, stats endpoint, production Dockerfile, docker-compose, startup script, 404 page, error handling polish. Full stack build verified." --mode now
```
