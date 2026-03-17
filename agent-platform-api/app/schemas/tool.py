from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class ToolTier(str, Enum):
    READ_ONLY = "read_only"
    NOTIFY = "notify"
    WRITE = "write"
    SENSITIVE = "sensitive"


class ToolType(str, Enum):
    API_CALL = "api_call"
    DATABASE_QUERY = "database_query"
    N8N_WORKFLOW = "n8n_workflow"
    PYTHON_FUNCTION = "python_function"


class ToolCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    display_name: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=10)
    tier: ToolTier
    tool_type: ToolType
    implementation: dict
    input_schema: dict
    output_schema: dict | None = None
    rate_limit_per_execution: int = 100
    rate_limit_per_day: int = 10000
    requires_approval: bool = False
    documentation_md: str | None = None

    model_config = {"from_attributes": True}


class ToolUpdate(BaseModel):
    display_name: str | None = None
    description: str | None = None
    tier: ToolTier | None = None
    implementation: dict | None = None
    input_schema: dict | None = None
    output_schema: dict | None = None
    rate_limit_per_execution: int | None = None
    rate_limit_per_day: int | None = None
    requires_approval: bool | None = None
    enabled: bool | None = None
    documentation_md: str | None = None

    model_config = {"from_attributes": True}


class ToolSummary(BaseModel):
    id: UUID
    name: str
    display_name: str
    description: str
    tier: str
    tool_type: str
    enabled: bool
    requires_approval: bool

    model_config = {"from_attributes": True}


class ToolDetail(BaseModel):
    id: UUID
    name: str
    display_name: str
    description: str
    tier: str
    tool_type: str
    implementation: dict
    input_schema: dict
    output_schema: dict | None = None
    rate_limit_per_execution: int
    rate_limit_per_day: int
    requires_approval: bool
    enabled: bool
    managed_by: str
    documentation_md: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
