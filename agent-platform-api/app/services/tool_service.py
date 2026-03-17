"""Tool service — CRUD for the tool registry."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tool import ToolRegistryEntry
from app.schemas.auth import UserResponse
from app.services import audit_service


async def _get_tool_or_404(
    db: AsyncSession, tool_id: uuid.UUID
) -> ToolRegistryEntry:
    result = await db.execute(
        select(ToolRegistryEntry).where(ToolRegistryEntry.id == tool_id)
    )
    tool = result.scalar_one_or_none()
    if tool is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool {tool_id} not found",
        )
    return tool


def _tool_to_detail(tool: ToolRegistryEntry) -> dict:
    return {
        "id": tool.id,
        "name": tool.name,
        "display_name": tool.display_name,
        "description": tool.description,
        "tier": tool.tier,
        "tool_type": tool.tool_type,
        "implementation": tool.implementation,
        "input_schema": tool.input_schema,
        "output_schema": tool.output_schema,
        "rate_limit_per_execution": tool.rate_limit_per_execution,
        "rate_limit_per_day": tool.rate_limit_per_day,
        "requires_approval": tool.requires_approval,
        "enabled": tool.enabled,
        "managed_by": str(tool.managed_by),
        "documentation_md": tool.documentation_md,
        "created_at": tool.created_at,
        "updated_at": tool.updated_at,
    }


def _tool_to_summary(tool: ToolRegistryEntry) -> dict:
    return {
        "id": tool.id,
        "name": tool.name,
        "display_name": tool.display_name,
        "description": tool.description,
        "tier": tool.tier,
        "tool_type": tool.tool_type,
        "enabled": tool.enabled,
        "requires_approval": tool.requires_approval,
    }


async def list_tools(
    db: AsyncSession,
    *,
    tier: str | None = None,
    enabled: bool = True,
) -> list[dict]:
    """List tools with optional filters."""
    query = select(ToolRegistryEntry)

    if tier:
        query = query.where(ToolRegistryEntry.tier == tier)
    query = query.where(ToolRegistryEntry.enabled == enabled)
    query = query.order_by(ToolRegistryEntry.name)

    result = await db.execute(query)
    tools = result.scalars().all()
    return [_tool_to_summary(t) for t in tools]


async def get_tool(
    db: AsyncSession,
    *,
    tool_id: uuid.UUID,
) -> dict:
    """Get a single tool with full details."""
    tool = await _get_tool_or_404(db, tool_id)
    return _tool_to_detail(tool)


async def create_tool(
    db: AsyncSession,
    *,
    name: str,
    display_name: str,
    description: str,
    tier: str,
    tool_type: str,
    implementation: dict,
    input_schema: dict,
    output_schema: dict | None,
    rate_limit_per_execution: int,
    rate_limit_per_day: int,
    requires_approval: bool,
    documentation_md: str | None,
    user: UserResponse,
) -> dict:
    """Create a new tool registry entry. Caller must be revops."""
    # Check for duplicate name
    existing = await db.execute(
        select(ToolRegistryEntry).where(ToolRegistryEntry.name == name)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tool with name '{name}' already exists",
        )

    tool = ToolRegistryEntry(
        name=name,
        display_name=display_name,
        description=description,
        tier=tier,
        tool_type=tool_type,
        implementation=implementation,
        input_schema=input_schema,
        output_schema=output_schema,
        rate_limit_per_execution=rate_limit_per_execution,
        rate_limit_per_day=rate_limit_per_day,
        requires_approval=requires_approval,
        documentation_md=documentation_md,
        managed_by=user.id,
    )
    db.add(tool)
    await db.flush()

    await audit_service.log_action(
        db,
        entity_type="tool",
        entity_id=tool.id,
        action="created",
        actor=user.id,
        details={"name": name, "tier": tier},
    )
    await db.flush()

    return _tool_to_detail(tool)


async def update_tool(
    db: AsyncSession,
    *,
    tool_id: uuid.UUID,
    data: dict,
    user: UserResponse,
) -> dict:
    """Update a tool registry entry. Caller must be revops."""
    tool = await _get_tool_or_404(db, tool_id)

    # Apply updates for any non-None fields
    updatable_fields = [
        "display_name", "description", "tier", "implementation",
        "input_schema", "output_schema", "rate_limit_per_execution",
        "rate_limit_per_day", "requires_approval", "enabled", "documentation_md",
    ]
    for field in updatable_fields:
        if field in data and data[field] is not None:
            setattr(tool, field, data[field])

    await db.flush()

    await audit_service.log_action(
        db,
        entity_type="tool",
        entity_id=tool.id,
        action="updated",
        actor=user.id,
        details={"updated_fields": [k for k in data if data[k] is not None]},
    )
    await db.flush()

    return _tool_to_detail(tool)
