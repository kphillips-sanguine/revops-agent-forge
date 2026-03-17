import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_definitions.id"), nullable=False
    )
    agent_version: Mapped[int] = mapped_column(Integer, nullable=False)
    trigger_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # scheduled | manual | webhook | event | simulation
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="running"
    )  # running | success | failed | timeout | cancelled
    input_context: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    llm_calls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_cost_micros: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )  # Cost in microdollars
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    initiated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    agent = relationship("AgentDefinition", back_populates="executions")
    tool_calls = relationship("ToolCallLog", back_populates="execution")

    __table_args__ = (
        Index("ix_exec_agent", "agent_id", "started_at"),
        Index("ix_exec_status", "status"),
        Index("ix_exec_started", "started_at"),
    )


class ToolCallLog(Base):
    __tablename__ = "tool_call_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    execution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_executions.id", ondelete="CASCADE"), nullable=False
    )
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)
    call_order: Mapped[int] = mapped_column(Integer, nullable=False)
    input_params: Mapped[dict] = mapped_column(JSONB, nullable=False)
    output_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # success | failed | timeout | blocked | rate_limited
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    called_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    execution = relationship("AgentExecution", back_populates="tool_calls")

    __table_args__ = (
        Index("ix_toolcall_execution", "execution_id", "call_order"),
    )
