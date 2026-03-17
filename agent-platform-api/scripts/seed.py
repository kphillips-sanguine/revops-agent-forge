"""Seed script — creates default admin user, tool registry entries, and API key."""

import asyncio
import uuid
from datetime import datetime, timezone

import bcrypt as _bcrypt

class _BcryptHelper:
    @staticmethod
    def hash(password: str) -> str:
        return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory, engine
from app.models.api_key import ApiKey
from app.models.tool import ToolRegistryEntry
from app.models.user import User

ADMIN_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_API_KEY = "agentforge-n8n-dev-key-2026"


SEED_TOOLS = [
    {
        "name": "salesforce_query",
        "display_name": "Salesforce Query (Read-Only)",
        "description": (
            "Execute SOQL queries against Salesforce to read data. "
            "Supports all standard and custom objects. Read-only — "
            "cannot create, update, or delete records."
        ),
        "tier": "read_only",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "sf_cli",
            "command": 'sf data query --query "{soql}" --target-org {org} --json',
            "default_org": "prod",
            "allowed_orgs": ["prod"],
            "timeout_seconds": 30,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "soql": {"type": "string", "description": "SOQL query to execute"},
                "org": {"type": "string", "enum": ["prod"], "default": "prod"},
            },
            "required": ["soql"],
        },
        "rate_limit_per_execution": 20,
        "rate_limit_per_day": 5000,
        "requires_approval": False,
        "documentation_md": "## Salesforce Query\n\nUse SOQL to read data from Salesforce.\n\n### Example\n```\nSELECT Id, Name FROM Account WHERE CreatedDate = TODAY\n```",
    },
    {
        "name": "sf_record_update",
        "display_name": "Salesforce Record Update",
        "description": (
            "Update existing Salesforce records. Requires specifying "
            "object type, record ID, and fields to update."
        ),
        "tier": "write",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "sf_cli",
            "command": (
                'sf data update record --sobject {object} --record-id {record_id} '
                '--values "{fields}" --target-org {org} --json'
            ),
            "default_org": "prod",
            "allowed_orgs": ["prod"],
            "timeout_seconds": 15,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "object": {"type": "string", "description": "SObject API name"},
                "record_id": {"type": "string", "description": "18-char record ID"},
                "fields": {"type": "object", "description": "Field:Value pairs to update"},
            },
            "required": ["object", "record_id", "fields"],
        },
        "rate_limit_per_execution": 10,
        "rate_limit_per_day": 500,
        "requires_approval": False,
        "documentation_md": "## Salesforce Record Update\n\nUpdate fields on an existing record.",
    },
    {
        "name": "slack_notify",
        "display_name": "Slack Notification",
        "description": (
            "Send messages to Slack channels. Supports formatting, "
            "mentions, and attachments."
        ),
        "tier": "notify",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "slack_api",
            "method": "chat.postMessage",
            "allowed_channels": ["#finance", "#critical-cases", "#general", "#revops"],
            "timeout_seconds": 10,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "Slack channel name"},
                "message": {"type": "string", "description": "Message text (supports Slack markdown)"},
                "thread_ts": {"type": "string", "description": "Thread timestamp for replies"},
            },
            "required": ["channel", "message"],
        },
        "rate_limit_per_execution": 5,
        "rate_limit_per_day": 200,
        "requires_approval": False,
        "documentation_md": "## Slack Notification\n\nSend messages to Slack channels.",
    },
    {
        "name": "email_send",
        "display_name": "Email Send",
        "description": "Send email messages. Supports HTML formatting and attachments.",
        "tier": "notify",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "email_api",
            "method": "send",
            "timeout_seconds": 15,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient email address"},
                "subject": {"type": "string", "description": "Email subject"},
                "body": {"type": "string", "description": "Email body (HTML)"},
            },
            "required": ["to", "subject", "body"],
        },
        "rate_limit_per_execution": 5,
        "rate_limit_per_day": 100,
        "requires_approval": False,
        "documentation_md": "## Email Send\n\nSend emails via the platform email service.",
    },
    {
        "name": "google_sheets_read",
        "display_name": "Google Sheets Read",
        "description": "Read data from Google Sheets spreadsheets. Returns cell data as JSON.",
        "tier": "read_only",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "google_sheets_api",
            "method": "spreadsheets.values.get",
            "timeout_seconds": 15,
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {"type": "string", "description": "Google Sheets spreadsheet ID"},
                "range": {"type": "string", "description": "Cell range (e.g. Sheet1!A1:D10)"},
            },
            "required": ["spreadsheet_id", "range"],
        },
        "rate_limit_per_execution": 10,
        "rate_limit_per_day": 1000,
        "requires_approval": False,
        "documentation_md": "## Google Sheets Read\n\nRead data from a Google Sheets spreadsheet.",
    },
]


async def seed() -> None:
    async with async_session_factory() as session:
        session: AsyncSession

        # 1. Create admin user
        existing = await session.execute(
            select(User).where(User.id == ADMIN_USER_ID)
        )
        if existing.scalar_one_or_none() is None:
            admin = User(
                id=ADMIN_USER_ID,
                email="kevin@sanguinebio.com",
                display_name="Kevin Phillips",
                role="revops",
                is_active=True,
            )
            session.add(admin)
            await session.flush()
            print("Created admin user: kevin@sanguinebio.com (revops)")
        else:
            print("Admin user already exists, skipping.")

        # 2. Create tool registry entries
        for tool_data in SEED_TOOLS:
            existing_tool = await session.execute(
                select(ToolRegistryEntry).where(ToolRegistryEntry.name == tool_data["name"])
            )
            if existing_tool.scalar_one_or_none() is None:
                tool = ToolRegistryEntry(
                    managed_by=ADMIN_USER_ID,
                    **tool_data,
                )
                session.add(tool)
                print(f"Created tool: {tool_data['name']}")
            else:
                print(f"Tool '{tool_data['name']}' already exists, skipping.")

        # 3. Create default API key for n8n
        key_hash = _BcryptHelper.hash(DEFAULT_API_KEY)
        existing_key = await session.execute(
            select(ApiKey).where(ApiKey.name == "n8n-default")
        )
        if existing_key.scalar_one_or_none() is None:
            api_key = ApiKey(
                name="n8n-default",
                key_hash=key_hash,
                role="service",
                is_active=True,
                created_by=ADMIN_USER_ID,
            )
            session.add(api_key)
            print(f"Created API key 'n8n-default'. Key value: {DEFAULT_API_KEY}")
        else:
            print("API key 'n8n-default' already exists, skipping.")

        await session.commit()
        print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
