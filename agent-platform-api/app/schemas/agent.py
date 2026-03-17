from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class AgentStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    ACTIVE = "active"
    DISABLED = "disabled"


class AgentCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    definition_md: str = Field(..., min_length=50)
    tools_allowed: list[str] = Field(default_factory=list)
    schedule: dict | None = None

    model_config = {"from_attributes": True}


class AgentUpdate(BaseModel):
    definition_md: str | None = None
    tools_allowed: list[str] | None = None
    schedule: dict | None = None

    model_config = {"from_attributes": True}


class AgentResponse(BaseModel):
    id: UUID
    name: str
    version: int
    status: AgentStatus
    definition_md: str
    guardrails_md: str | None = None
    tools_allowed: list[str]
    schedule: dict | None = None
    created_by: str
    approved_by: str | None = None
    created_at: datetime
    updated_at: datetime
    last_execution_at: datetime | None = None
    execution_count: int = 0
    estimated_cost: float = 0.0

    model_config = {"from_attributes": True}


class AgentSummary(BaseModel):
    id: UUID
    name: str
    version: int
    status: AgentStatus
    created_by: str
    tags: list[str] = Field(default_factory=list)
    last_execution_at: datetime | None = None
    execution_count: int = 0
    success_rate: float = 0.0
    estimated_cost: float = 0.0

    model_config = {"from_attributes": True}


class AgentVersionSummary(BaseModel):
    id: UUID
    agent_id: UUID
    version: int
    changed_by: str
    change_reason: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentDiff(BaseModel):
    agent_id: UUID
    v1: int
    v2: int
    v1_md: str
    v2_md: str

    model_config = {"from_attributes": True}


class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=5)


class ApproveRequest(BaseModel):
    notes: str | None = None


class DisableRequest(BaseModel):
    reason: str | None = None
