"""Execution service — run agents, get/list/cancel executions."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent import AgentDefinition
from app.models.execution import AgentExecution, ToolCallLog
from app.runtime.executor import AgentExecutor

logger = logging.getLogger(__name__)


# ---------- Helpers to convert DB rows to registry dicts ----------

def _tool_registry_to_dicts(rows: list) -> list[dict]:
    """Convert ToolRegistryEntry rows to plain dicts for the executor."""
    return [
        {
            "name": r.name,
            "display_name": r.display_name,
            "description": r.description,
            "tier": r.tier,
            "tool_type": r.tool_type,
            "implementation": r.implementation,
            "input_schema": r.input_schema,
            "output_schema": r.output_schema,
            "rate_limit_per_execution": r.rate_limit_per_execution,
            "rate_limit_per_day": r.rate_limit_per_day,
            "requires_approval": r.requires_approval,
            "enabled": r.enabled,
        }
        for r in rows
    ]


# ---------- Public API ----------

async def run_agent(
    db: AsyncSession,
    agent_id: UUID,
    trigger_type: str,
    input_context: dict,
    initiated_by: UUID | None = None,
) -> dict:
    """Create an execution record, run the agent executor, and update the record."""
    from app.models.tool import ToolRegistryEntry

    # Fetch agent
    agent = await db.get(AgentDefinition, agent_id)
    if agent is None or agent.is_deleted:
        raise ValueError(f"Agent {agent_id} not found")
    if agent.status != "active":
        raise ValueError(
            f"Agent {agent_id} is '{agent.status}' — only active agents can be executed"
        )

    # Create execution record
    execution = AgentExecution(
        agent_id=agent.id,
        agent_version=agent.version,
        trigger_type=trigger_type,
        status="running",
        input_context=input_context,
        initiated_by=initiated_by,
        started_at=datetime.now(timezone.utc),
    )
    db.add(execution)
    await db.flush()  # Get the execution ID

    # Fetch tool registry
    result = await db.execute(
        select(ToolRegistryEntry).where(ToolRegistryEntry.enabled.is_(True))
    )
    registry_rows = result.scalars().all()
    tool_registry = _tool_registry_to_dicts(registry_rows)

    # Run executor
    executor = AgentExecutor(tool_registry=tool_registry)
    exec_result = await executor.execute(
        agent_definition={
            "definition_md": agent.definition_md,
            "tools_allowed": agent.tools_allowed or [],
        },
        input_context=input_context,
        execution_id=execution.id,
        trigger_type=trigger_type,
    )

    # Update execution record
    execution.status = exec_result["status"]
    execution.output = (
        {"text": exec_result["output"]}
        if isinstance(exec_result.get("output"), str)
        else exec_result.get("output")
    )
    execution.llm_calls = exec_result.get("llm_calls", 0)
    execution.tokens_used = exec_result.get("tokens_used", 0)
    # Estimate cost: ~$3/M input + $15/M output for sonnet, rough $8/M average
    execution.estimated_cost_micros = int(
        exec_result.get("tokens_used", 0) * 8 / 1000
    )
    execution.completed_at = datetime.now(timezone.utc)
    execution.error_log = exec_result.get("error")

    # Save tool call logs
    for i, tc in enumerate(exec_result.get("tool_calls", [])):
        log_entry = ToolCallLog(
            execution_id=execution.id,
            tool_name=tc["tool_name"],
            call_order=i + 1,
            input_params=tc.get("input", {}),
            output_data=tc.get("output"),
            status=tc.get("status", "failed"),
            duration_ms=tc.get("duration_ms"),
            error=tc.get("error"),
            called_at=datetime.now(timezone.utc),
        )
        db.add(log_entry)

    # Update agent last_execution_at
    agent.last_execution_at = datetime.now(timezone.utc)

    await db.flush()

    duration = exec_result.get("duration_seconds", 0)

    return {
        "execution_id": execution.id,
        "agent_id": agent.id,
        "agent_version": agent.version,
        "status": execution.status,
        "output": execution.output,
        "llm_calls": execution.llm_calls,
        "tokens_used": execution.tokens_used,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "duration_seconds": round(duration, 2),
        "error": execution.error_log,
    }


async def get_execution(db: AsyncSession, execution_id: UUID) -> dict | None:
    """Get a single execution with tool call logs."""
    result = await db.execute(
        select(AgentExecution)
        .options(selectinload(AgentExecution.tool_calls))
        .where(AgentExecution.id == execution_id)
    )
    execution = result.scalar_one_or_none()
    if execution is None:
        return None

    duration = None
    if execution.completed_at and execution.started_at:
        duration = (execution.completed_at - execution.started_at).total_seconds()

    tool_calls = sorted(execution.tool_calls, key=lambda tc: tc.call_order)

    return {
        "execution_id": execution.id,
        "agent_id": execution.agent_id,
        "agent_version": execution.agent_version,
        "trigger_type": execution.trigger_type,
        "status": execution.status,
        "input_context": execution.input_context or {},
        "output": execution.output,
        "llm_calls": execution.llm_calls,
        "tokens_used": execution.tokens_used,
        "estimated_cost_micros": execution.estimated_cost_micros,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "error_log": execution.error_log,
        "tool_calls": [
            {
                "id": tc.id,
                "tool_name": tc.tool_name,
                "call_order": tc.call_order,
                "input_params": tc.input_params,
                "output_data": tc.output_data,
                "status": tc.status,
                "duration_ms": tc.duration_ms,
                "error": tc.error,
                "called_at": tc.called_at,
            }
            for tc in tool_calls
        ],
    }


async def list_executions(
    db: AsyncSession,
    agent_id: UUID | None = None,
    status: str | None = None,
    trigger_type: str | None = None,
    since: datetime | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[dict]:
    """List executions with optional filters."""
    query = select(AgentExecution).order_by(AgentExecution.started_at.desc())

    if agent_id:
        query = query.where(AgentExecution.agent_id == agent_id)
    if status:
        query = query.where(AgentExecution.status == status)
    if trigger_type:
        query = query.where(AgentExecution.trigger_type == trigger_type)
    if since:
        query = query.where(AgentExecution.started_at >= since)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    executions = result.scalars().all()

    summaries = []
    for e in executions:
        duration = None
        if e.completed_at and e.started_at:
            duration = (e.completed_at - e.started_at).total_seconds()

        # Try to get agent name
        agent_name = None
        if e.agent:
            agent_name = e.agent.name

        summaries.append(
            {
                "execution_id": e.id,
                "agent_id": e.agent_id,
                "agent_name": agent_name,
                "agent_version": e.agent_version,
                "trigger_type": e.trigger_type,
                "status": e.status,
                "started_at": e.started_at,
                "completed_at": e.completed_at,
                "duration_seconds": round(duration, 2) if duration else None,
                "tokens_used": e.tokens_used,
            }
        )
    return summaries


async def get_execution_logs(
    db: AsyncSession, execution_id: UUID
) -> list[dict]:
    """Get tool call logs for an execution."""
    result = await db.execute(
        select(ToolCallLog)
        .where(ToolCallLog.execution_id == execution_id)
        .order_by(ToolCallLog.call_order)
    )
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "tool_name": log.tool_name,
            "call_order": log.call_order,
            "input_params": log.input_params,
            "output_data": log.output_data,
            "status": log.status,
            "duration_ms": log.duration_ms,
            "error": log.error,
            "called_at": log.called_at,
        }
        for log in logs
    ]


async def cancel_execution(db: AsyncSession, execution_id: UUID) -> dict | None:
    """Cancel a running execution."""
    execution = await db.get(AgentExecution, execution_id)
    if execution is None:
        return None

    if execution.status != "running":
        raise ValueError(
            f"Cannot cancel execution in '{execution.status}' status"
        )

    execution.status = "cancelled"
    execution.completed_at = datetime.now(timezone.utc)
    execution.error_log = "Cancelled by user"
    await db.flush()

    duration = None
    if execution.completed_at and execution.started_at:
        duration = (execution.completed_at - execution.started_at).total_seconds()

    return {
        "execution_id": execution.id,
        "agent_id": execution.agent_id,
        "agent_version": execution.agent_version,
        "status": execution.status,
        "output": execution.output,
        "llm_calls": execution.llm_calls,
        "tokens_used": execution.tokens_used,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "duration_seconds": round(duration, 2) if duration else None,
        "error": execution.error_log,
    }
