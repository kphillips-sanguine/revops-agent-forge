Read PLAN.md and BACKEND_PHASES.md in this directory. Execute Phase B2 from BACKEND_PHASES.md.

Phase B1 is complete in `agent-platform-api/`. The FastAPI scaffold, SQLAlchemy models, Alembic migrations, Pydantic schemas, dependencies, and routers (with stub endpoints) are all built.

Build on top of the existing code. Implement the actual business logic in the service layer and wire up the router stubs to use the services.

Do NOT ask questions — make decisions and build.

Key requirements:
1. Agent service with full CRUD + lifecycle state machine (draft→pending_review→approved→active→disabled)
2. Each lifecycle transition validates current status, records audit log entry
3. Version tracking — every update creates a new AgentVersion record
4. Tool service with CRUD, revops-only create/update enforcement
5. Audit service for logging all significant actions
6. All router stubs should be fully implemented with real DB operations
7. Error handling — return proper HTTP status codes (400 for invalid transitions, 404 for not found, 403 for unauthorized)

After implementing, verify the server starts: cd agent-platform-api && .venv\Scripts\activate && python -m uvicorn app.main:app --port 8000
Fix any import errors or issues before finishing.

When completely finished and verified working, run this exact command:
```
openclaw system event --text "B2 Complete: Agent CRUD, lifecycle state machine, tool registry, audit logging, all endpoints fully implemented with DB operations." --mode now
```
