"""Schemas for connected systems, documents, guardrails, and business context."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Connected Systems ───────────────────────────────────────────

class SystemCapabilities(BaseModel):
    read: bool = True
    write: bool = False
    query: bool = False
    webhook: bool = False


class ConnectedSystemCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-z0-9_-]+$")
    description: str = ""
    icon: str = "database"
    category: str = Field(..., pattern=r"^(crm|erp|marketing|storage|ecommerce|lims|other)$")
    status: str = Field(default="active", pattern=r"^(active|inactive|coming_soon)$")
    base_url: str | None = None
    auth_type: str = Field(default="api_key", pattern=r"^(oauth|api_key|token)$")
    credential_ref: str | None = None
    capabilities: SystemCapabilities = Field(default_factory=SystemCapabilities)


class ConnectedSystemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    category: str | None = None
    status: str | None = None
    base_url: str | None = None
    auth_type: str | None = None
    credential_ref: str | None = None
    capabilities: SystemCapabilities | None = None


class ConnectedSystemResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str
    icon: str
    category: str
    status: str
    base_url: str | None
    auth_type: str
    credential_ref: str | None
    capabilities: SystemCapabilities | dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectedSystemSummary(BaseModel):
    id: UUID
    name: str
    slug: str
    icon: str
    category: str
    status: str
    capabilities: SystemCapabilities | dict

    model_config = {"from_attributes": True}


# ─── System Documents ────────────────────────────────────────────

class SystemDocumentCreate(BaseModel):
    doc_type: str = Field(..., pattern=r"^(architecture|data_model|integration_guide|api_reference)$")
    title: str = Field(..., min_length=3, max_length=200)
    content_md: str = ""


class SystemDocumentUpdate(BaseModel):
    title: str | None = None
    content_md: str | None = None


class SystemDocumentResponse(BaseModel):
    id: UUID
    system_id: UUID
    doc_type: str
    title: str
    content_md: str
    version: int
    updated_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Guardrail Rules ─────────────────────────────────────────────

class GuardrailRuleCreate(BaseModel):
    scope: str = Field(default="global", pattern=r"^(global|system)$")
    system_id: UUID | None = None
    category: str = Field(..., pattern=r"^(data_access|pii|rate_limit|cost|compliance|safety)$")
    name: str = Field(..., min_length=3, max_length=200)
    description: str = ""
    rule_type: str = Field(default="warn", pattern=r"^(block|warn|log)$")
    rule_definition: dict = Field(default_factory=dict)
    enabled: bool = True
    priority: int = Field(default=100, ge=1, le=1000)


class GuardrailRuleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    rule_type: str | None = None
    rule_definition: dict | None = None
    enabled: bool | None = None
    priority: int | None = None


class GuardrailRuleResponse(BaseModel):
    id: UUID
    scope: str
    system_id: UUID | None
    category: str
    name: str
    description: str
    rule_type: str
    rule_definition: dict
    enabled: bool
    priority: int
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Business Context ────────────────────────────────────────────

class BusinessContextUpsert(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content_md: str = ""


class BusinessContextResponse(BaseModel):
    id: UUID
    context_key: str
    title: str
    content_md: str
    version: int
    updated_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Builder Context (assembled for builder prompt) ──────────────

class BuilderContextResponse(BaseModel):
    company_context: str
    systems_context: str
    guardrails_context: str
    full_prompt_section: str
