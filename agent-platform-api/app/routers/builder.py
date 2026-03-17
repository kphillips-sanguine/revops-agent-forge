from fastapi import APIRouter, Depends

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

router = APIRouter(prefix="/api/builder", tags=["builder"])


@router.post("/generate", response_model=BuilderResponse)
async def generate_agent(
    request: BuilderRequest,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Generate or refine an Agent MD definition from natural language."""
    raise NotImplementedError("Builder service implemented in Phase B5")


@router.post("/validate", response_model=ValidationResult)
async def validate_definition(
    request: ValidateRequest,
) -> dict:
    """Validate an Agent MD definition against the schema."""
    raise NotImplementedError("Validation service implemented in Phase B4")


@router.post("/simulate", response_model=SimulationResult)
async def simulate_agent(
    request: SimulationRequest,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Dry-run an agent with mock tool responses."""
    raise NotImplementedError("Simulation service implemented in Phase B5")
