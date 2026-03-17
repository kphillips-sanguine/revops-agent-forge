from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.schemas.agent import (
    AgentCreate,
    AgentDiff,
    AgentResponse,
    AgentStatus,
    AgentSummary,
    AgentUpdate,
    AgentVersionSummary,
    ApproveRequest,
    DisableRequest,
    RejectRequest,
)
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.post("/", response_model=AgentResponse, status_code=201)
async def create_agent(
    agent: AgentCreate,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Create a new agent definition in draft status."""
    # Stub — will be implemented in Phase B2
    raise NotImplementedError("Agent CRUD implemented in Phase B2")


@router.get("/", response_model=list[AgentSummary])
async def list_agents(
    status: AgentStatus | None = None,
    tag: str | None = None,
    created_by: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    user: UserResponse = Depends(get_current_user),
) -> list[dict]:
    """List agents with optional filters."""
    return []


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    version: int | None = None,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Get full agent definition including MD content."""
    raise NotImplementedError("Agent CRUD implemented in Phase B2")


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent: AgentUpdate,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Update agent definition. Creates new version."""
    raise NotImplementedError("Agent CRUD implemented in Phase B2")


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> None:
    """Soft-delete an agent."""
    raise NotImplementedError("Agent CRUD implemented in Phase B2")


@router.patch("/{agent_id}/submit", response_model=AgentResponse)
async def submit_for_review(
    agent_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Transition: draft -> pending_review."""
    raise NotImplementedError("Agent lifecycle implemented in Phase B2")


@router.patch("/{agent_id}/approve", response_model=AgentResponse)
async def approve_agent(
    agent_id: UUID,
    body: ApproveRequest | None = None,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Transition: pending_review -> approved. Requires reviewer role."""
    raise NotImplementedError("Agent lifecycle implemented in Phase B2")


@router.patch("/{agent_id}/reject", response_model=AgentResponse)
async def reject_agent(
    agent_id: UUID,
    body: RejectRequest,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Transition: pending_review -> draft. Returns with feedback."""
    raise NotImplementedError("Agent lifecycle implemented in Phase B2")


@router.patch("/{agent_id}/activate", response_model=AgentResponse)
async def activate_agent(
    agent_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Transition: approved -> active."""
    raise NotImplementedError("Agent lifecycle implemented in Phase B2")


@router.patch("/{agent_id}/disable", response_model=AgentResponse)
async def disable_agent(
    agent_id: UUID,
    body: DisableRequest | None = None,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Transition: active -> disabled."""
    raise NotImplementedError("Agent lifecycle implemented in Phase B2")


@router.get("/{agent_id}/versions", response_model=list[AgentVersionSummary])
async def list_versions(
    agent_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> list[dict]:
    """List all versions of an agent definition."""
    return []


@router.get("/{agent_id}/diff", response_model=AgentDiff)
async def diff_versions(
    agent_id: UUID,
    v1: int = Query(...),
    v2: int = Query(...),
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Diff two versions of an agent definition."""
    raise NotImplementedError("Agent diff implemented in Phase B2")
