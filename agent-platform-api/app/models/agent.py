import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AgentDefinition(Base):
    __tablename__ = "agent_definitions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft"
    )  # draft | pending_review | approved | active | disabled
    definition_md: Mapped[str] = mapped_column(Text, nullable=False)
    guardrails_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    tools_allowed: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    schedule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approval_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_execution_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    executions = relationship("AgentExecution", back_populates="agent")
    versions_history = relationship("AgentVersion", back_populates="agent")

    __table_args__ = (
        Index("ix_agent_status", "status"),
        Index("ix_agent_created_by", "created_by"),
        Index("ix_agent_status_created", "status", "created_at"),
        Index("ix_agent_name_version", "name", "version", unique=True),
    )


class AgentVersion(Base):
    """Stores every version of an agent definition for audit trail."""

    __tablename__ = "agent_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_definitions.id"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    definition_md: Mapped[str] = mapped_column(Text, nullable=False)
    tools_allowed: Mapped[list] = mapped_column(JSONB, nullable=False)
    schedule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    changed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    agent = relationship("AgentDefinition", back_populates="versions_history")

    __table_args__ = (
        Index("ix_version_agent", "agent_id", "version", unique=True),
    )
