from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.schemas.audit import AuditEntryResponse
from app.schemas.auth import UserResponse
from app.services import audit_service

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/", response_model=list[AuditEntryResponse])
async def list_audit_entries(
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    actor: UUID | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List audit log entries with optional filters."""
    return await audit_service.list_audit_entries(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor,
        since=since,
        until=until,
        skip=skip,
        limit=limit,
    )


@router.get("/{entity_type}/{entity_id}", response_model=list[AuditEntryResponse])
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: UUID,
    user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get the full audit trail for a specific entity."""
    return await audit_service.get_audit_trail(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
    )
