"""Load and instantiate allowed tools from the tool registry."""

import logging
from typing import Any

from app.runtime.tools.base import BaseTool
from app.runtime.tools.salesforce_query import SalesforceQueryTool
from app.runtime.tools.sf_record_update import SfRecordUpdateTool
from app.runtime.tools.slack_notify import SlackNotifyTool
from app.runtime.tools.email_send import EmailSendTool
from app.runtime.tools.google_sheets_read import GoogleSheetsReadTool

logger = logging.getLogger(__name__)

# Map of tool registry names to their implementation classes
TOOL_IMPLEMENTATIONS: dict[str, type[BaseTool]] = {
    "salesforce_query": SalesforceQueryTool,
    "sf_record_update": SfRecordUpdateTool,
    "slack_notify": SlackNotifyTool,
    "email_send": EmailSendTool,
    "google_sheets_read": GoogleSheetsReadTool,
}


def load_tools(
    allowed_tools: list[dict[str, Any]],
    tool_registry: list[dict[str, Any]],
    execution_id: str | None = None,
    rate_limits: dict[str, int] | None = None,
) -> list[BaseTool]:
    """Load tool instances that are both in the agent's allowed list AND enabled in the registry.

    Args:
        allowed_tools: List of tool dicts from the agent config (name, tier, etc.).
        tool_registry: List of registry entry dicts (from DB).
        execution_id: Current execution ID for logging.
        rate_limits: Per-tool rate limits keyed by tool name.

    Returns:
        List of instantiated BaseTool subclasses ready for execution.
    """
    if rate_limits is None:
        rate_limits = {}

    # Build a lookup of enabled registry entries
    registry_lookup: dict[str, dict[str, Any]] = {}
    for entry in tool_registry:
        name = entry.get("name", "")
        if entry.get("enabled", True):
            registry_lookup[name] = entry

    # Allowed tool names from the agent
    allowed_names = {t["name"] for t in allowed_tools}

    loaded: list[BaseTool] = []
    for tool_name in allowed_names:
        if tool_name not in registry_lookup:
            logger.warning(
                "Tool '%s' is allowed by agent but not found/enabled in registry — skipping",
                tool_name,
            )
            continue

        impl_class = TOOL_IMPLEMENTATIONS.get(tool_name)
        if impl_class is None:
            logger.warning(
                "Tool '%s' has no implementation class — skipping",
                tool_name,
            )
            continue

        rate_limit = rate_limits.get(
            tool_name,
            registry_lookup[tool_name].get("rate_limit_per_execution", 100),
        )

        instance = impl_class(
            execution_id=execution_id,
            rate_limit=rate_limit,
        )
        loaded.append(instance)
        logger.info("Loaded tool: %s (rate_limit=%d)", tool_name, rate_limit)

    return loaded
