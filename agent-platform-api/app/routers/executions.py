from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, verify_api_key
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
from app.services import execution_service

router = APIRouter(prefix="/api/exec", tags=["executions"])


@router.post("/run", response_model=ExecutionResponse)
async def run_agent(
    request: ExecutionRequest,
    api_key: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Execute an agent. Called by n8n or manual trigger."""
    try:
        result = await execution_service.run_agent(
            db=db,
            agent_id=request.agent_id,
            trigger_type=request.trigger_type,
            input_context=request.input_context,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{execution_id}", response_model=ExecutionDetail)
async def get_execution(
    execution_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get detailed execution results including tool call logs."""
    result = await execution_service.get_execution(db, execution_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    return result


@router.get("/", response_model=list[ExecutionSummary])
async def list_executions(
    agent_id: UUID | None = None,
    status: ExecutionStatus | None = None,
    trigger: TriggerType | None = None,
    since: datetime | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List executions with filters."""
    return await execution_service.list_executions(
        db=db,
        agent_id=agent_id,
        status=status.value if status else None,
        trigger_type=trigger.value if trigger else None,
        since=since,
        skip=skip,
        limit=limit,
    )


@router.get("/{execution_id}/logs", response_model=list[ToolCallLogSchema])
async def get_execution_logs(
    execution_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get detailed tool call logs for an execution."""
    return await execution_service.get_execution_logs(db, execution_id)


@router.post("/{execution_id}/cancel", response_model=ExecutionResponse)
async def cancel_execution(
    execution_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cancel a running execution."""
    try:
        result = await execution_service.cancel_execution(db, execution_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Execution not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
