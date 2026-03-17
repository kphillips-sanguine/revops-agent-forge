Read PLAN.md and BACKEND_PHASES.md in this directory. Execute Phase B1 from BACKEND_PHASES.md.

Build everything inside the `agent-platform-api/` subdirectory.

IMPORTANT NOTES:
- Use Python 3.12+ features
- Use SQLAlchemy 2.0 async patterns (AsyncSession, async_sessionmaker)
- Use Pydantic v2 (model_config instead of class Config)
- The database is PostgreSQL — use asyncpg driver
- For Alembic async setup, use the async template pattern with run_async()
- Create a requirements.txt with pinned versions
- Create a proper __init__.py in every Python package directory

Do NOT ask questions — make decisions and build. Be thorough and complete.

After creating all files:
1. Create a virtual environment: python -m venv .venv
2. Activate it and install requirements
3. Verify the app starts: python -m uvicorn app.main:app --port 8000
4. Fix any errors before finishing

When completely finished and verified working, run this exact command:
```
openclaw system event --text "B1 Complete: FastAPI scaffold, SQLAlchemy models, Alembic migrations, Pydantic schemas, seed script, Dockerfile all built. Server starts clean." --mode now
```
