"""Audit service for logging all significant actions."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    entity_type: str,
    entity_id: uuid.UUID,
    action: str,
    actor: uuid.UUID,
    details: dict | None = None,
) -> AuditLog:
    """Create an audit log entry for a significant action."""
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        details=details,
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_audit_trail(
    db: AsyncSession,
    *,
    entity_type: str,
    entity_id: uuid.UUID,
) -> list[AuditLog]:
    """Get audit trail for a specific entity."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.desc())
    )
    return list(result.scalars().all())
