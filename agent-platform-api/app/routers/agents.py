from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_role
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
from app.services import agent_service

router = APIRouter(prefix="/api/agents", tags=["agents"])


def _check_owner_or_revops(user: UserResponse, created_by: str) -> None:
    """Raise 403 if user is not the agent owner and not revops."""
    if user.role == "revops":
        return
    if str(user.id) != str(created_by):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own agents",
        )


@router.post("/", response_model=AgentResponse, status_code=201)
async def create_agent(
    agent: AgentCreate,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new agent definition in draft status. Any authenticated user."""
    return await agent_service.create_agent(
        db,
        name=agent.name,
        definition_md=agent.definition_md,
        tools_allowed=agent.tools_allowed,
        schedule=agent.schedule,
        user=user,
    )


@router.get("/", response_model=list[AgentSummary])
async def list_agents(
    status: AgentStatus | None = None,
    tag: str | None = None,
    created_by: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List agents with optional filters. Any authenticated user."""
    return await agent_service.list_agents(
        db,
        status_filter=status.value if status else None,
        tag=tag,
        created_by=created_by,
        skip=skip,
        limit=limit,
    )


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    version: int | None = None,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get full agent definition including MD content. Any authenticated user."""
    return await agent_service.get_agent(db, agent_id=agent_id, version=version)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent: AgentUpdate,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update agent definition. Owner or revops only."""
    # Check ownership
    existing = await agent_service.get_agent(db, agent_id=agent_id)
    _check_owner_or_revops(user, existing["created_by"])
    return await agent_service.update_agent(
        db,
        agent_id=agent_id,
        definition_md=agent.definition_md,
        tools_allowed=agent.tools_allowed,
        schedule=agent.schedule,
        user=user,
    )


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete an agent. Owner or revops only."""
    existing = await agent_service.get_agent(db, agent_id=agent_id)
    _check_owner_or_revops(user, existing["created_by"])
    await agent_service.delete_agent(db, agent_id=agent_id, user=user)


@router.patch("/{agent_id}/submit", response_model=AgentResponse)
async def submit_for_review(
    agent_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Transition: draft -> pending_review. Owner or revops only."""
    existing = await agent_service.get_agent(db, agent_id=agent_id)
    _check_owner_or_revops(user, existing["created_by"])
    return await agent_service.submit_for_review(db, agent_id=agent_id, user=user)


@router.patch("/{agent_id}/approve", response_model=AgentResponse)
async def approve_agent(
    agent_id: UUID,
    body: ApproveRequest | None = None,
    user: UserResponse = Depends(require_role("reviewer", "revops")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Transition: pending_review -> approved. Reviewer or revops only."""
    return await agent_service.approve_agent(
        db,
        agent_id=agent_id,
        notes=body.notes if body else None,
        user=user,
    )


@router.patch("/{agent_id}/reject", response_model=AgentResponse)
async def reject_agent(
    agent_id: UUID,
    body: RejectRequest,
    user: UserResponse = Depends(require_role("reviewer", "revops")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Transition: pending_review -> draft. Reviewer or revops only."""
    return await agent_service.reject_agent(
        db,
        agent_id=agent_id,
        reason=body.reason,
        user=user,
    )


@router.patch("/{agent_id}/activate", response_model=AgentResponse)
async def activate_agent(
    agent_id: UUID,
    user: UserResponse = Depends(require_role("admin", "revops")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Transition: approved -> active. Admin or revops only."""
    return await agent_service.activate_agent(db, agent_id=agent_id, user=user)


@router.patch("/{agent_id}/disable", response_model=AgentResponse)
async def disable_agent(
    agent_id: UUID,
    body: DisableRequest | None = None,
    user: UserResponse = Depends(require_role("admin", "revops")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Transition: active -> disabled. Admin or revops only."""
    return await agent_service.disable_agent(
        db,
        agent_id=agent_id,
        reason=body.reason if body else None,
        user=user,
    )


@router.get("/{agent_id}/versions", response_model=list[AgentVersionSummary])
async def list_versions(
    agent_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List all versions of an agent definition. Any authenticated user."""
    return await agent_service.list_versions(db, agent_id=agent_id)


@router.get("/{agent_id}/diff", response_model=AgentDiff)
async def diff_versions(
    agent_id: UUID,
    v1: int = Query(...),
    v2: int = Query(...),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Diff two versions of an agent definition. Any authenticated user."""
    return await agent_service.diff_versions(db, agent_id=agent_id, v1=v1, v2=v2)
