"""Connected systems, system documents, guardrail rules, and business context models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConnectedSystem(Base):
    __tablename__ = "connected_systems"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="database")
    category: Mapped[str] = mapped_column(
        String(30), nullable=False, default="other"
    )  # crm | erp | marketing | storage | ecommerce | lims | other
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # active | inactive | coming_soon
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    auth_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="api_key"
    )  # oauth | api_key | token
    credential_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    capabilities: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=lambda: {"read": True, "write": False, "query": False, "webhook": False}
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_connected_systems_slug", "slug"),
        Index("ix_connected_systems_category", "category"),
    )


class SystemDocument(Base):
    __tablename__ = "system_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    system_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connected_systems.id", ondelete="CASCADE"), nullable=False
    )
    doc_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # architecture | data_model | integration_guide | api_reference
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_system_documents_system_id", "system_id"),
        Index("ix_system_documents_doc_type", "doc_type"),
    )


class GuardrailRule(Base):
    __tablename__ = "guardrail_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scope: Mapped[str] = mapped_column(
        String(20), nullable=False, default="global"
    )  # global | system
    system_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("connected_systems.id", ondelete="CASCADE"), nullable=True
    )
    category: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # data_access | pii | rate_limit | cost | compliance | safety
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    rule_type: Mapped[str] = mapped_column(
        String(10), nullable=False, default="warn"
    )  # block | warn | log
    rule_definition: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_guardrail_rules_scope", "scope"),
        Index("ix_guardrail_rules_system_id", "system_id"),
        Index("ix_guardrail_rules_category", "category"),
    )


class BusinessContext(Base):
    __tablename__ = "business_context"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    context_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_business_context_key", "context_key"),
    )
