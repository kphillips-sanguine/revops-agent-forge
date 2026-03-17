import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ToolRegistryEntry(Base):
    __tablename__ = "tool_registry"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tier: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # read_only | notify | write | sensitive
    tool_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # api_call | database_query | n8n_workflow | python_function
    implementation: Mapped[dict] = mapped_column(JSONB, nullable=False)
    input_schema: Mapped[dict] = mapped_column(JSONB, nullable=False)
    output_schema: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rate_limit_per_execution: Mapped[int] = mapped_column(
        Integer, nullable=False, default=100
    )
    rate_limit_per_day: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10000
    )
    requires_approval: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    managed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    documentation_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_tool_name", "name"),
        Index("ix_tool_tier", "tier"),
    )
