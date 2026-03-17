import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import agents, audit, auth, builder, executions, stats, tools


def create_app() -> FastAPI:
    application = FastAPI(
        title="AgentForge API",
        description="AI Agent Platform — governed agent creation and execution",
        version="0.1.0",
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    application.include_router(auth.router)
    application.include_router(agents.router)
    application.include_router(audit.router)
    application.include_router(builder.router)
    application.include_router(executions.router)
    application.include_router(stats.router)
    application.include_router(tools.router)

    # Health check
    @application.get("/api/health", tags=["health"])
    async def health_check() -> dict:
        return {"status": "healthy", "environment": settings.ENVIRONMENT}

    # Serve frontend static files in production
    static_dir = Path(__file__).resolve().parent.parent / "static"
    if static_dir.is_dir():
        # Mount static assets (JS, CSS, images)
        application.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

        # SPA catch-all: serve index.html for any non-API route
        @application.get("/{full_path:path}")
        async def serve_spa(request: Request, full_path: str):
            # Don't catch API routes
            if full_path.startswith("api/"):
                return {"detail": "Not Found"}
            index_file = static_dir / "index.html"
            if index_file.is_file():
                return FileResponse(str(index_file))
            return {"detail": "Frontend not built"}

    return application


app = create_app()
