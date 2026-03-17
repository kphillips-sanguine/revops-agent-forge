from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, verify_api_key
from app.schemas.auth import UserResponse
from app.schemas.execution import (
    ExecutionDetail,
    ExecutionRequest,
    ExecutionResponse,
    ExecutionStatus,
    ExecutionSummary,
    ToolCallLogSchema,
    TriggerType,
)

router = APIRouter(prefix="/api/exec", tags=["executions"])


@router.post("/run", response_model=ExecutionResponse)
async def run_agent(
    request: ExecutionRequest,
    api_key: str = Depends(verify_api_key),
) -> dict:
    """Execute an agent. Called by n8n or manual trigger."""
    raise NotImplementedError("Execution service implemented in Phase B4")


@router.get("/{execution_id}", response_model=ExecutionDetail)
async def get_execution(
    execution_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Get detailed execution results including tool call logs."""
    raise NotImplementedError("Execution service implemented in Phase B4")


@router.get("/", response_model=list[ExecutionSummary])
async def list_executions(
    agent_id: UUID | None = None,
    status: ExecutionStatus | None = None,
    trigger: TriggerType | None = None,
    since: datetime | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    user: UserResponse = Depends(get_current_user),
) -> list[dict]:
    """List executions with filters."""
    return []


@router.get("/{execution_id}/logs", response_model=list[ToolCallLogSchema])
async def get_execution_logs(
    execution_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> list[dict]:
    """Get detailed tool call logs for an execution."""
    return []


@router.post("/{execution_id}/cancel", response_model=ExecutionResponse)
async def cancel_execution(
    execution_id: UUID,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    """Cancel a running execution."""
    raise NotImplementedError("Execution service implemented in Phase B4")
