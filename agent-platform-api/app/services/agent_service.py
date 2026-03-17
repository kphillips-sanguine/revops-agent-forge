"""Agent service — CRUD, lifecycle state machine, version tracking."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentDefinition, AgentVersion
from app.models.execution import AgentExecution
from app.schemas.auth import UserResponse
from app.services import audit_service

# ── Lifecycle state machine ──────────────────────────────────────────────────

VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft": ["pending_review"],
    "pending_review": ["approved", "draft"],  # approve or reject (back to draft)
    "approved": ["active"],
    "active": ["disabled"],
    "disabled": ["draft"],  # allow re-enabling by going back to draft
}


def _check_transition(current: str, target: str) -> None:
    allowed = VALID_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition: '{current}' → '{target}'. Allowed from '{current}': {allowed}",
        )


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_agent_or_404(
    db: AsyncSession, agent_id: uuid.UUID
) -> AgentDefinition:
    result = await db.execute(
        select(AgentDefinition).where(
            AgentDefinition.id == agent_id,
            AgentDefinition.is_deleted == False,  # noqa: E712
        )
    )
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent {agent_id} not found",
        )
    return agent


async def _agent_to_response(db: AsyncSession, agent: AgentDefinition) -> dict:
    """Convert an AgentDefinition ORM object to a response dict."""
    # Count executions
    count_result = await db.execute(
        select(func.count()).where(AgentExecution.agent_id == agent.id)
    )
    execution_count = count_result.scalar() or 0

    # Sum estimated cost
    cost_result = await db.execute(
        select(func.coalesce(func.sum(AgentExecution.estimated_cost_micros), 0)).where(
            AgentExecution.agent_id == agent.id
        )
    )
    total_cost_micros = cost_result.scalar() or 0

    return {
        "id": agent.id,
        "name": agent.name,
        "version": agent.version,
        "status": agent.status,
        "definition_md": agent.definition_md,
        "guardrails_md": agent.guardrails_md,
        "tools_allowed": agent.tools_allowed,
        "schedule": agent.schedule,
        "created_by": str(agent.created_by),
        "approved_by": str(agent.approved_by) if agent.approved_by else None,
        "created_at": agent.created_at,
        "updated_at": agent.updated_at,
        "last_execution_at": agent.last_execution_at,
        "execution_count": execution_count,
        "estimated_cost": total_cost_micros / 1_000_000,
    }


async def _agent_to_summary(db: AsyncSession, agent: AgentDefinition) -> dict:
    """Convert an AgentDefinition ORM object to a summary dict."""
    # Count executions
    count_result = await db.execute(
        select(func.count()).where(AgentExecution.agent_id == agent.id)
    )
    execution_count = count_result.scalar() or 0

    # Success rate
    if execution_count > 0:
        success_result = await db.execute(
            select(func.count()).where(
                AgentExecution.agent_id == agent.id,
                AgentExecution.status == "success",
            )
        )
        success_count = success_result.scalar() or 0
        success_rate = success_count / execution_count
    else:
        success_rate = 0.0

    # Sum estimated cost
    cost_result = await db.execute(
        select(func.coalesce(func.sum(AgentExecution.estimated_cost_micros), 0)).where(
            AgentExecution.agent_id == agent.id
        )
    )
    total_cost_micros = cost_result.scalar() or 0

    return {
        "id": agent.id,
        "name": agent.name,
        "version": agent.version,
        "status": agent.status,
        "created_by": str(agent.created_by),
        "tags": agent.tags or [],
        "last_execution_at": agent.last_execution_at,
        "execution_count": execution_count,
        "success_rate": round(success_rate, 3),
        "estimated_cost": total_cost_micros / 1_000_000,
    }


# ── CRUD ─────────────────────────────────────────────────────────────────────

async def create_agent(
    db: AsyncSession,
    *,
    name: str,
    definition_md: str,
    tools_allowed: list[str],
    schedule: dict | None,
    user: UserResponse,
) -> dict:
    """Create a new agent in draft status (version 1)."""
    agent = AgentDefinition(
        name=name,
        version=1,
        status="draft",
        definition_md=definition_md,
        tools_allowed=tools_allowed,
        schedule=schedule,
        created_by=user.id,
    )
    db.add(agent)
    await db.flush()

    # Create initial version record
    version = AgentVersion(
        agent_id=agent.id,
        version=1,
        definition_md=definition_md,
        tools_allowed=tools_allowed,
        schedule=schedule,
        changed_by=user.id,
        change_reason="Initial creation",
    )
    db.add(version)

    # Audit log
    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="created",
        actor=user.id,
        details={"name": name, "version": 1},
    )

    await db.flush()
    return await _agent_to_response(db, agent)


async def get_agent(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    version: int | None = None,
) -> dict:
    """Get an agent. If version is specified, return that version's definition."""
    agent = await _get_agent_or_404(db, agent_id)

    if version is not None:
        # Fetch a specific version's definition
        result = await db.execute(
            select(AgentVersion).where(
                AgentVersion.agent_id == agent_id,
                AgentVersion.version == version,
            )
        )
        ver = result.scalar_one_or_none()
        if ver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {version} not found for agent {agent_id}",
            )
        # Override the definition with the requested version
        agent.definition_md = ver.definition_md
        agent.tools_allowed = ver.tools_allowed
        agent.schedule = ver.schedule

    return await _agent_to_response(db, agent)


async def list_agents(
    db: AsyncSession,
    *,
    status_filter: str | None = None,
    tag: str | None = None,
    created_by: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[dict]:
    """List agents with optional filters."""
    query = select(AgentDefinition).where(AgentDefinition.is_deleted == False)  # noqa: E712

    if status_filter:
        query = query.where(AgentDefinition.status == status_filter)
    if tag:
        # JSONB array contains
        query = query.where(AgentDefinition.tags.contains([tag]))
    if created_by:
        query = query.where(AgentDefinition.created_by == uuid.UUID(created_by))

    query = query.order_by(AgentDefinition.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    agents = result.scalars().all()

    summaries = []
    for agent in agents:
        summaries.append(await _agent_to_summary(db, agent))
    return summaries


async def update_agent(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    definition_md: str | None,
    tools_allowed: list[str] | None,
    schedule: dict | None,
    user: UserResponse,
) -> dict:
    """Update an agent definition. Creates a new version record."""
    agent = await _get_agent_or_404(db, agent_id)

    # Only draft agents can be edited
    if agent.status not in ("draft", "disabled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit agent in '{agent.status}' status. Must be 'draft' or 'disabled'.",
        )

    # Apply changes
    if definition_md is not None:
        agent.definition_md = definition_md
    if tools_allowed is not None:
        agent.tools_allowed = tools_allowed
    if schedule is not None:
        agent.schedule = schedule

    # Increment version
    agent.version += 1
    agent.updated_at = datetime.now(timezone.utc)

    # Create version record
    version = AgentVersion(
        agent_id=agent.id,
        version=agent.version,
        definition_md=agent.definition_md,
        tools_allowed=agent.tools_allowed,
        schedule=agent.schedule,
        changed_by=user.id,
        change_reason="Updated definition",
    )
    db.add(version)

    # Audit log
    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="updated",
        actor=user.id,
        details={"version": agent.version},
    )

    await db.flush()
    return await _agent_to_response(db, agent)


async def delete_agent(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    user: UserResponse,
) -> None:
    """Soft-delete an agent."""
    agent = await _get_agent_or_404(db, agent_id)
    agent.is_deleted = True
    agent.updated_at = datetime.now(timezone.utc)

    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="deleted",
        actor=user.id,
    )
    await db.flush()


# ── Lifecycle transitions ────────────────────────────────────────────────────

async def submit_for_review(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    user: UserResponse,
) -> dict:
    """Transition: draft → pending_review."""
    agent = await _get_agent_or_404(db, agent_id)
    _check_transition(agent.status, "pending_review")

    agent.status = "pending_review"
    agent.rejection_reason = None  # clear any previous rejection
    agent.updated_at = datetime.now(timezone.utc)

    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="submitted_for_review",
        actor=user.id,
    )
    await db.flush()
    return await _agent_to_response(db, agent)


async def approve_agent(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    notes: str | None,
    user: UserResponse,
) -> dict:
    """Transition: pending_review → approved."""
    agent = await _get_agent_or_404(db, agent_id)
    _check_transition(agent.status, "approved")

    agent.status = "approved"
    agent.approved_by = user.id
    agent.approval_notes = notes
    agent.updated_at = datetime.now(timezone.utc)

    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="approved",
        actor=user.id,
        details={"notes": notes},
    )
    await db.flush()
    return await _agent_to_response(db, agent)


async def reject_agent(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    reason: str,
    user: UserResponse,
) -> dict:
    """Transition: pending_review → draft (with rejection reason)."""
    agent = await _get_agent_or_404(db, agent_id)
    _check_transition(agent.status, "draft")

    agent.status = "draft"
    agent.rejection_reason = reason
    agent.updated_at = datetime.now(timezone.utc)

    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="rejected",
        actor=user.id,
        details={"reason": reason},
    )
    await db.flush()
    return await _agent_to_response(db, agent)


async def activate_agent(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    user: UserResponse,
) -> dict:
    """Transition: approved → active."""
    agent = await _get_agent_or_404(db, agent_id)
    _check_transition(agent.status, "active")

    agent.status = "active"
    agent.updated_at = datetime.now(timezone.utc)

    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="activated",
        actor=user.id,
    )
    await db.flush()
    return await _agent_to_response(db, agent)


async def disable_agent(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    reason: str | None,
    user: UserResponse,
) -> dict:
    """Transition: active → disabled."""
    agent = await _get_agent_or_404(db, agent_id)
    _check_transition(agent.status, "disabled")

    agent.status = "disabled"
    agent.updated_at = datetime.now(timezone.utc)

    await audit_service.log_action(
        db,
        entity_type="agent",
        entity_id=agent.id,
        action="disabled",
        actor=user.id,
        details={"reason": reason} if reason else None,
    )
    await db.flush()
    return await _agent_to_response(db, agent)


# ── Version history ──────────────────────────────────────────────────────────

async def list_versions(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
) -> list[dict]:
    """List all versions of an agent."""
    # Ensure agent exists
    await _get_agent_or_404(db, agent_id)

    result = await db.execute(
        select(AgentVersion)
        .where(AgentVersion.agent_id == agent_id)
        .order_by(AgentVersion.version.desc())
    )
    versions = result.scalars().all()

    return [
        {
            "id": v.id,
            "agent_id": v.agent_id,
            "version": v.version,
            "changed_by": str(v.changed_by),
            "change_reason": v.change_reason,
            "created_at": v.created_at,
        }
        for v in versions
    ]


async def diff_versions(
    db: AsyncSession,
    *,
    agent_id: uuid.UUID,
    v1: int,
    v2: int,
) -> dict:
    """Return the MD content of two versions for comparison."""
    await _get_agent_or_404(db, agent_id)

    result1 = await db.execute(
        select(AgentVersion).where(
            AgentVersion.agent_id == agent_id, AgentVersion.version == v1
        )
    )
    ver1 = result1.scalar_one_or_none()
    if ver1 is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {v1} not found",
        )

    result2 = await db.execute(
        select(AgentVersion).where(
            AgentVersion.agent_id == agent_id, AgentVersion.version == v2
        )
    )
    ver2 = result2.scalar_one_or_none()
    if ver2 is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {v2} not found",
        )

    return {
        "agent_id": agent_id,
        "v1": v1,
        "v2": v2,
        "v1_md": ver1.definition_md,
        "v2_md": ver2.definition_md,
    }
