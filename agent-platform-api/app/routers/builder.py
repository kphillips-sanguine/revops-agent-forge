from fastapi import APIRouter, Depends, HTTPException, status

from app.database import async_session_factory
from app.dependencies import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.builder import (
    BuilderRequest,
    BuilderResponse,
    SimulationRequest,
    SimulationResult,
    ValidateRequest,
    ValidationResult,
)
from app.services import builder_service, simulation_service
from app.services.tool_service import list_tools
from app.services.validation_service import validate_agent_md

router = APIRouter(prefix="/api/builder", tags=["builder"])


@router.post("/generate", response_model=BuilderResponse)
async def generate_agent(
    request: BuilderRequest,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Generate or refine an Agent MD definition from natural language."""
    # Fetch available tools from registry for context
    available_tools: list[dict] = []
    try:
        async with async_session_factory() as db:
            available_tools = await list_tools(db, enabled=True)
    except Exception:
        # If DB is unavailable, proceed without tool context
        pass

    try:
        result = await builder_service.generate_agent(
            prompt=request.prompt,
            conversation_history=request.conversation_history,
            current_definition=request.current_definition,
            available_tools=available_tools,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Builder generation failed: {e}",
        )


@router.post("/validate", response_model=ValidationResult)
async def validate_definition(
    request: ValidateRequest,
) -> dict:
    """Validate an Agent MD definition against the schema."""
    return validate_agent_md(request.definition_md)


@router.post("/simulate", response_model=SimulationResult)
async def simulate_agent(
    request: SimulationRequest,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Dry-run an agent with mock tool responses."""
    definition_md = request.definition_md

    # If agent_id provided but no definition_md, fetch from DB
    if not definition_md and request.agent_id:
        try:
            from app.services.agent_service import get_agent

            async with async_session_factory() as db:
                agent = await get_agent(db, agent_id=request.agent_id)
                definition_md = agent.get("definition_md")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not load agent: {e}",
            )

    if not definition_md:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either definition_md or a valid agent_id is required",
        )

    try:
        result = await simulation_service.simulate_agent(
            definition_md=definition_md,
            mock_inputs=request.mock_inputs,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {e}",
        )
