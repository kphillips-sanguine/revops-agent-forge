"""Dashboard stats service."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentDefinition
from app.models.execution import AgentExecution


async def get_overview(db: AsyncSession) -> dict:
    """Get dashboard overview stats."""
    # Active agents count
    active_result = await db.execute(
        select(func.count()).where(
            AgentDefinition.status == "active",
            AgentDefinition.is_deleted == False,  # noqa: E712
        )
    )
    active_agents = active_result.scalar() or 0

    # Pending review count
    pending_result = await db.execute(
        select(func.count()).where(
            AgentDefinition.status == "pending_review",
            AgentDefinition.is_deleted == False,  # noqa: E712
        )
    )
    pending_review = pending_result.scalar() or 0

    # Executions this week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    exec_result = await db.execute(
        select(func.count()).where(
            AgentExecution.started_at >= week_ago,
        )
    )
    executions_this_week = exec_result.scalar() or 0

    # Estimated cost this week (microdollars -> dollars)
    cost_result = await db.execute(
        select(func.coalesce(func.sum(AgentExecution.estimated_cost_micros), 0)).where(
            AgentExecution.started_at >= week_ago,
        )
    )
    cost_micros = cost_result.scalar() or 0

    return {
        "active_agents": active_agents,
        "pending_review": pending_review,
        "executions_this_week": executions_this_week,
        "estimated_cost_this_week": round(cost_micros / 1_000_000, 4),
    }
