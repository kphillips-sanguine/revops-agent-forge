from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import agents, auth, builder, executions, tools


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
    application.include_router(builder.router)
    application.include_router(executions.router)
    application.include_router(tools.router)

    # Health check
    @application.get("/api/health", tags=["health"])
    async def health_check() -> dict:
        return {"status": "healthy", "environment": settings.ENVIRONMENT}

    return application


app = create_app()
