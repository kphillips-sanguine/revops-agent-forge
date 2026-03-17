"""Admin service for connected systems, documents, guardrails, and business context."""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import (
    BusinessContext,
    ConnectedSystem,
    GuardrailRule,
    SystemDocument,
)

logger = logging.getLogger(__name__)


# ─── Connected Systems ───────────────────────────────────────────

async def list_systems(db: AsyncSession, include_inactive: bool = False) -> list[ConnectedSystem]:
    stmt = select(ConnectedSystem).order_by(ConnectedSystem.name)
    if not include_inactive:
        stmt = stmt.where(ConnectedSystem.status != "inactive")
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_system(db: AsyncSession, system_id: uuid.UUID) -> ConnectedSystem | None:
    result = await db.execute(select(ConnectedSystem).where(ConnectedSystem.id == system_id))
    return result.scalar_one_or_none()


async def get_system_by_slug(db: AsyncSession, slug: str) -> ConnectedSystem | None:
    result = await db.execute(select(ConnectedSystem).where(ConnectedSystem.slug == slug))
    return result.scalar_one_or_none()


async def create_system(db: AsyncSession, data: dict) -> ConnectedSystem:
    system = ConnectedSystem(**data)
    db.add(system)
    await db.flush()
    await db.refresh(system)
    return system


async def update_system(db: AsyncSession, system_id: uuid.UUID, data: dict) -> ConnectedSystem | None:
    system = await get_system(db, system_id)
    if not system:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(system, key, value)
    system.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(system)
    return system


async def delete_system(db: AsyncSession, system_id: uuid.UUID) -> bool:
    system = await get_system(db, system_id)
    if not system:
        return False
    await db.execute(delete(ConnectedSystem).where(ConnectedSystem.id == system_id))
    await db.flush()
    return True


# ─── System Documents ────────────────────────────────────────────

async def list_documents(db: AsyncSession, system_id: uuid.UUID) -> list[SystemDocument]:
    result = await db.execute(
        select(SystemDocument)
        .where(SystemDocument.system_id == system_id)
        .order_by(SystemDocument.doc_type, SystemDocument.title)
    )
    return list(result.scalars().all())


async def get_document(db: AsyncSession, doc_id: uuid.UUID) -> SystemDocument | None:
    result = await db.execute(select(SystemDocument).where(SystemDocument.id == doc_id))
    return result.scalar_one_or_none()


async def create_document(db: AsyncSession, system_id: uuid.UUID, data: dict, user_email: str) -> SystemDocument:
    doc = SystemDocument(
        system_id=system_id,
        updated_by=user_email,
        **data,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def update_document(db: AsyncSession, doc_id: uuid.UUID, data: dict, user_email: str) -> SystemDocument | None:
    doc = await get_document(db, doc_id)
    if not doc:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(doc, key, value)
    doc.version += 1
    doc.updated_by = user_email
    doc.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, doc_id: uuid.UUID) -> bool:
    doc = await get_document(db, doc_id)
    if not doc:
        return False
    await db.execute(delete(SystemDocument).where(SystemDocument.id == doc_id))
    await db.flush()
    return True


# ─── Guardrail Rules ─────────────────────────────────────────────

async def list_guardrails(
    db: AsyncSession,
    scope: str | None = None,
    system_id: uuid.UUID | None = None,
    category: str | None = None,
) -> list[GuardrailRule]:
    stmt = select(GuardrailRule).order_by(GuardrailRule.priority, GuardrailRule.name)
    if scope:
        stmt = stmt.where(GuardrailRule.scope == scope)
    if system_id:
        stmt = stmt.where(GuardrailRule.system_id == system_id)
    if category:
        stmt = stmt.where(GuardrailRule.category == category)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_guardrail(db: AsyncSession, rule_id: uuid.UUID) -> GuardrailRule | None:
    result = await db.execute(select(GuardrailRule).where(GuardrailRule.id == rule_id))
    return result.scalar_one_or_none()


async def create_guardrail(db: AsyncSession, data: dict, user_email: str) -> GuardrailRule:
    rule = GuardrailRule(created_by=user_email, **data)
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


async def update_guardrail(db: AsyncSession, rule_id: uuid.UUID, data: dict) -> GuardrailRule | None:
    rule = await get_guardrail(db, rule_id)
    if not rule:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(rule, key, value)
    rule.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(rule)
    return rule


async def delete_guardrail(db: AsyncSession, rule_id: uuid.UUID) -> bool:
    rule = await get_guardrail(db, rule_id)
    if not rule:
        return False
    await db.execute(delete(GuardrailRule).where(GuardrailRule.id == rule_id))
    await db.flush()
    return True


# ─── Business Context ────────────────────────────────────────────

async def list_business_context(db: AsyncSession) -> list[BusinessContext]:
    result = await db.execute(select(BusinessContext).order_by(BusinessContext.context_key))
    return list(result.scalars().all())


async def get_business_context(db: AsyncSession, key: str) -> BusinessContext | None:
    result = await db.execute(select(BusinessContext).where(BusinessContext.context_key == key))
    return result.scalar_one_or_none()


async def upsert_business_context(db: AsyncSession, key: str, data: dict, user_email: str) -> BusinessContext:
    existing = await get_business_context(db, key)
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        existing.version += 1
        existing.updated_by = user_email
        existing.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(existing)
        return existing
    else:
        ctx = BusinessContext(
            context_key=key,
            updated_by=user_email,
            **data,
        )
        db.add(ctx)
        await db.flush()
        await db.refresh(ctx)
        return ctx


# ─── Builder Context Assembly ────────────────────────────────────

async def assemble_builder_context(db: AsyncSession) -> dict:
    """Assemble all admin-managed context into a single prompt section for the builder."""
    # Get business context
    biz_contexts = await list_business_context(db)
    company_parts = []
    for ctx in biz_contexts:
        if ctx.content_md.strip():
            company_parts.append(f"### {ctx.title}\n{ctx.content_md}")
    company_context = "\n\n".join(company_parts) if company_parts else "No business context configured yet."

    # Get active systems with their docs
    systems = await list_systems(db, include_inactive=False)
    system_parts = []
    for sys in systems:
        caps = sys.capabilities if isinstance(sys.capabilities, dict) else {}
        cap_list = [k for k, v in caps.items() if v]
        cap_str = ", ".join(cap_list) if cap_list else "none"

        sys_section = f"### {sys.name} ({sys.category})\n"
        sys_section += f"- **Status:** {sys.status}\n"
        sys_section += f"- **Capabilities:** {cap_str}\n"
        sys_section += f"- **Description:** {sys.description}\n"

        # Get docs for this system
        docs = await list_documents(db, sys.id)
        for doc in docs:
            if doc.content_md.strip():
                sys_section += f"\n#### {doc.title}\n{doc.content_md}\n"

        system_parts.append(sys_section)
    systems_context = "\n\n".join(system_parts) if system_parts else "No connected systems configured."

    # Get active guardrails
    guardrails = await list_guardrails(db)
    active_rules = [g for g in guardrails if g.enabled]
    guardrail_parts = []
    for rule in active_rules:
        guardrail_parts.append(f"- **[{rule.rule_type.upper()}]** {rule.name}: {rule.description}")
    guardrails_context = "\n".join(guardrail_parts) if guardrail_parts else "No guardrail rules configured."

    # Assemble full prompt section
    full_prompt = f"""## Company & Business Context
{company_context}

## Connected Systems & Data
The following enterprise systems are available. Agents can be built to interact with any of these systems using their respective tools.

{systems_context}

## Active Guardrails & Rules
These rules MUST be respected by all agents:
{guardrails_context}
"""
    return {
        "company_context": company_context,
        "systems_context": systems_context,
        "guardrails_context": guardrails_context,
        "full_prompt_section": full_prompt,
    }
