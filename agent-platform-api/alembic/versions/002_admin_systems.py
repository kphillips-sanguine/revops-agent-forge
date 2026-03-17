"""Add connected systems, system documents, guardrail rules, and business context tables.

Revision ID: 002_admin_systems
Revises: 001_initial
Create Date: 2026-03-16
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_admin_systems"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Connected Systems
    op.create_table(
        "connected_systems",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(50), unique=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("icon", sa.String(50), nullable=False, server_default="database"),
        sa.Column("category", sa.String(30), nullable=False, server_default="other"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("base_url", sa.String(500), nullable=True),
        sa.Column("auth_type", sa.String(20), nullable=False, server_default="api_key"),
        sa.Column("credential_ref", sa.String(100), nullable=True),
        sa.Column("capabilities", postgresql.JSON(), nullable=False, server_default='{"read": true, "write": false, "query": false, "webhook": false}'),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_connected_systems_slug", "connected_systems", ["slug"])
    op.create_index("ix_connected_systems_category", "connected_systems", ["category"])

    # System Documents
    op.create_table(
        "system_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("system_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("connected_systems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doc_type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_by", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_system_documents_system_id", "system_documents", ["system_id"])
    op.create_index("ix_system_documents_doc_type", "system_documents", ["doc_type"])

    # Guardrail Rules
    op.create_table(
        "guardrail_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scope", sa.String(20), nullable=False, server_default="global"),
        sa.Column("system_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("connected_systems.id", ondelete="CASCADE"), nullable=True),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("rule_type", sa.String(10), nullable=False, server_default="warn"),
        sa.Column("rule_definition", postgresql.JSON(), nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("created_by", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_guardrail_rules_scope", "guardrail_rules", ["scope"])
    op.create_index("ix_guardrail_rules_system_id", "guardrail_rules", ["system_id"])
    op.create_index("ix_guardrail_rules_category", "guardrail_rules", ["category"])

    # Business Context
    op.create_table(
        "business_context",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("context_key", sa.String(50), unique=True, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_by", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_business_context_key", "business_context", ["context_key"])


def downgrade() -> None:
    op.drop_table("business_context")
    op.drop_table("guardrail_rules")
    op.drop_table("system_documents")
    op.drop_table("connected_systems")
