"""Audit service for logging all significant actions."""

import uuid
from datetime import datetime

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
) -> list[dict]:
    """Get audit trail for a specific entity."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.desc())
    )
    entries = result.scalars().all()
    return [_entry_to_dict(e) for e in entries]


async def list_audit_entries(
    db: AsyncSession,
    *,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    actor: uuid.UUID | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[dict]:
    """List audit entries with optional filters."""
    query = select(AuditLog)

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if actor:
        query = query.where(AuditLog.actor == actor)
    if since:
        query = query.where(AuditLog.created_at >= since)
    if until:
        query = query.where(AuditLog.created_at <= until)

    query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    entries = result.scalars().all()
    return [_entry_to_dict(e) for e in entries]


def _entry_to_dict(entry: AuditLog) -> dict:
    return {
        "id": entry.id,
        "entity_type": entry.entity_type,
        "entity_id": entry.entity_id,
        "action": entry.action,
        "actor": entry.actor,
        "details": entry.details,
        "created_at": entry.created_at,
    }
