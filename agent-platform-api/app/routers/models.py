"""Models router — list available LLM models and get recommendations."""

from fastapi import APIRouter, Body

from app.runtime.models import list_models, recommend_model

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("/")
async def get_models() -> list[dict]:
    """List all available LLM models."""
    return list_models()


@router.post("/recommend")
async def get_recommendation(
    definition_md: str = Body(..., embed=True),
) -> dict:
    """Analyze an agent definition and recommend a model."""
    return recommend_model(definition_md)
