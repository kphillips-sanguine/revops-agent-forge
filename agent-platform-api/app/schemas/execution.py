from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class ExecutionStatus(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


class TriggerType(str, Enum):
    SCHEDULED = "scheduled"
    MANUAL = "manual"
    WEBHOOK = "webhook"
    EVENT = "event"
    SIMULATION = "simulation"


class ExecutionRequest(BaseModel):
    agent_id: UUID
    trigger_type: str = "manual"
    input_context: dict = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class ExecutionResponse(BaseModel):
    execution_id: UUID
    agent_id: UUID
    agent_version: int
    status: str
    output: dict | None = None
    llm_calls: int = 0
    tokens_used: int = 0
    started_at: datetime
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    error: str | None = None

    model_config = {"from_attributes": True}


class ExecutionSummary(BaseModel):
    execution_id: UUID
    agent_id: UUID
    agent_name: str | None = None
    agent_version: int
    trigger_type: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    tokens_used: int = 0

    model_config = {"from_attributes": True}


class ExecutionDetail(BaseModel):
    execution_id: UUID
    agent_id: UUID
    agent_version: int
    trigger_type: str
    status: str
    input_context: dict
    output: dict | None = None
    llm_calls: int = 0
    tokens_used: int = 0
    estimated_cost_micros: int = 0
    started_at: datetime
    completed_at: datetime | None = None
    error_log: str | None = None
    tool_calls: list["ToolCallLogSchema"] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ToolCallLogSchema(BaseModel):
    id: UUID
    tool_name: str
    call_order: int
    input_params: dict
    output_data: dict | None = None
    status: str
    duration_ms: int | None = None
    error: str | None = None
    called_at: datetime

    model_config = {"from_attributes": True}
