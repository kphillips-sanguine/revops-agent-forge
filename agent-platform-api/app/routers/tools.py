from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, require_role
from app.schemas.auth import UserResponse
from app.schemas.tool import (
    ToolCreate,
    ToolDetail,
    ToolSummary,
    ToolTier,
    ToolUpdate,
)

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("/", response_model=list[ToolSummary])
async def list_tools(
    tier: ToolTier | None = None,
    enabled: bool = True,
    user: UserResponse = Depends(get_current_user),
) -> list[dict]:
    """List available tools."""
    return []


@router.get("/{tool_id}", response_model=ToolDetail)
async def get_tool(
    tool_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Get tool details including documentation and usage examples."""
    raise NotImplementedError("Tool CRUD implemented in Phase B2")


@router.post("/", response_model=ToolDetail, status_code=201)
async def create_tool(
    tool: ToolCreate,
    user: UserResponse = Depends(require_role("revops")),
) -> dict:
    """Register a new tool. RevOps only."""
    raise NotImplementedError("Tool CRUD implemented in Phase B2")


@router.put("/{tool_id}", response_model=ToolDetail)
async def update_tool(
    tool_id: UUID,
    tool: ToolUpdate,
    user: UserResponse = Depends(require_role("revops")),
) -> dict:
    """Update tool configuration. RevOps only."""
    raise NotImplementedError("Tool CRUD implemented in Phase B2")
