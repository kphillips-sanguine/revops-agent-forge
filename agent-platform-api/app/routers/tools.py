from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_role
from app.schemas.auth import UserResponse
from app.schemas.tool import (
    ToolCreate,
    ToolDetail,
    ToolSummary,
    ToolTier,
    ToolUpdate,
)
from app.services import tool_service

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("/", response_model=list[ToolSummary])
async def list_tools(
    tier: ToolTier | None = None,
    enabled: bool = True,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List available tools."""
    return await tool_service.list_tools(
        db,
        tier=tier.value if tier else None,
        enabled=enabled,
    )


@router.get("/{tool_id}", response_model=ToolDetail)
async def get_tool(
    tool_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get tool details including documentation and usage examples."""
    return await tool_service.get_tool(db, tool_id=tool_id)


@router.post("/", response_model=ToolDetail, status_code=201)
async def create_tool(
    tool: ToolCreate,
    user: UserResponse = Depends(require_role("revops")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Register a new tool. RevOps only."""
    return await tool_service.create_tool(
        db,
        name=tool.name,
        display_name=tool.display_name,
        description=tool.description,
        tier=tool.tier.value,
        tool_type=tool.tool_type.value,
        implementation=tool.implementation,
        input_schema=tool.input_schema,
        output_schema=tool.output_schema,
        rate_limit_per_execution=tool.rate_limit_per_execution,
        rate_limit_per_day=tool.rate_limit_per_day,
        requires_approval=tool.requires_approval,
        documentation_md=tool.documentation_md,
        user=user,
    )


@router.put("/{tool_id}", response_model=ToolDetail)
async def update_tool(
    tool_id: UUID,
    tool: ToolUpdate,
    user: UserResponse = Depends(require_role("revops")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update tool configuration. RevOps only."""
    data = tool.model_dump(exclude_unset=True)
    # Convert enum values to strings
    if "tier" in data and data["tier"] is not None:
        data["tier"] = data["tier"].value if hasattr(data["tier"], "value") else data["tier"]
    return await tool_service.update_tool(
        db,
        tool_id=tool_id,
        data=data,
        user=user,
    )
