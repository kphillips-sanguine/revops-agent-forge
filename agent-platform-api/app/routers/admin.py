"""Admin routes for systems, documents, guardrails, and business context."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_role
from app.schemas.auth import UserResponse
from app.schemas.system import (
    BuilderContextResponse,
    BusinessContextResponse,
    BusinessContextUpsert,
    ConnectedSystemCreate,
    ConnectedSystemResponse,
    ConnectedSystemSummary,
    ConnectedSystemUpdate,
    GuardrailRuleCreate,
    GuardrailRuleResponse,
    GuardrailRuleUpdate,
    SystemDocumentCreate,
    SystemDocumentResponse,
    SystemDocumentUpdate,
)
from app.services import admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ─── Connected Systems ───────────────────────────────────────────


@router.get("/systems", response_model=list[ConnectedSystemSummary])
async def list_systems(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """List all connected systems. Any authenticated user can read."""
    return await admin_service.list_systems(db, include_inactive)


@router.get("/systems/{system_id}", response_model=ConnectedSystemResponse)
async def get_system(
    system_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    system = await admin_service.get_system(db, system_id)
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    return system


@router.post("/systems", response_model=ConnectedSystemResponse, status_code=201)
async def create_system(
    body: ConnectedSystemCreate,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    existing = await admin_service.get_system_by_slug(db, body.slug)
    if existing:
        raise HTTPException(status_code=409, detail=f"System with slug '{body.slug}' already exists")
    data = body.model_dump()
    if "capabilities" in data and hasattr(data["capabilities"], "model_dump"):
        data["capabilities"] = data["capabilities"].model_dump()
    elif "capabilities" in data and isinstance(data["capabilities"], dict):
        pass  # already a dict
    return await admin_service.create_system(db, data)


@router.put("/systems/{system_id}", response_model=ConnectedSystemResponse)
async def update_system(
    system_id: uuid.UUID,
    body: ConnectedSystemUpdate,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    data = body.model_dump(exclude_unset=True)
    if "capabilities" in data and data["capabilities"] is not None:
        caps = data["capabilities"]
        data["capabilities"] = caps.model_dump() if hasattr(caps, "model_dump") else caps
    result = await admin_service.update_system(db, system_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="System not found")
    return result


@router.delete("/systems/{system_id}", status_code=204)
async def delete_system(
    system_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin")),
):
    deleted = await admin_service.delete_system(db, system_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="System not found")


# ─── System Documents ────────────────────────────────────────────


@router.get("/systems/{system_id}/documents", response_model=list[SystemDocumentResponse])
async def list_documents(
    system_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    system = await admin_service.get_system(db, system_id)
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    return await admin_service.list_documents(db, system_id)


@router.post("/systems/{system_id}/documents", response_model=SystemDocumentResponse, status_code=201)
async def create_document(
    system_id: uuid.UUID,
    body: SystemDocumentCreate,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    system = await admin_service.get_system(db, system_id)
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    return await admin_service.create_document(db, system_id, body.model_dump(), user.email)


@router.put("/documents/{doc_id}", response_model=SystemDocumentResponse)
async def update_document(
    doc_id: uuid.UUID,
    body: SystemDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    data = body.model_dump(exclude_unset=True)
    result = await admin_service.update_document(db, doc_id, data, user.email)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    deleted = await admin_service.delete_document(db, doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")


# ─── Guardrail Rules ─────────────────────────────────────────────


@router.get("/guardrails", response_model=list[GuardrailRuleResponse])
async def list_guardrails(
    scope: str | None = None,
    system_id: uuid.UUID | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    return await admin_service.list_guardrails(db, scope, system_id, category)


@router.post("/guardrails", response_model=GuardrailRuleResponse, status_code=201)
async def create_guardrail(
    body: GuardrailRuleCreate,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    if body.scope == "system" and body.system_id is None:
        raise HTTPException(status_code=400, detail="system_id required when scope is 'system'")
    return await admin_service.create_guardrail(db, body.model_dump(), user.email)


@router.put("/guardrails/{rule_id}", response_model=GuardrailRuleResponse)
async def update_guardrail(
    rule_id: uuid.UUID,
    body: GuardrailRuleUpdate,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    data = body.model_dump(exclude_unset=True)
    result = await admin_service.update_guardrail(db, rule_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Guardrail not found")
    return result


@router.delete("/guardrails/{rule_id}", status_code=204)
async def delete_guardrail(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    deleted = await admin_service.delete_guardrail(db, rule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Guardrail not found")


# ─── Business Context ────────────────────────────────────────────


@router.get("/context", response_model=list[BusinessContextResponse])
async def list_business_context(
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    return await admin_service.list_business_context(db)


@router.get("/context/{key}", response_model=BusinessContextResponse)
async def get_business_context(
    key: str,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    ctx = await admin_service.get_business_context(db, key)
    if not ctx:
        raise HTTPException(status_code=404, detail=f"Context key '{key}' not found")
    return ctx


@router.put("/context/{key}", response_model=BusinessContextResponse)
async def upsert_business_context(
    key: str,
    body: BusinessContextUpsert,
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(require_role("admin", "revops")),
):
    valid_keys = {"company_overview", "org_structure", "processes", "terminology", "data_flow", "compliance"}
    if key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid context key. Must be one of: {', '.join(sorted(valid_keys))}")
    return await admin_service.upsert_business_context(db, key, body.model_dump(), user.email)


# ─── Builder Context (assembled) ─────────────────────────────────


@router.get("/builder-context", response_model=BuilderContextResponse)
async def get_builder_context(
    db: AsyncSession = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """Get assembled context for the builder prompt. Any authenticated user can read."""
    return await admin_service.assemble_builder_context(db)
