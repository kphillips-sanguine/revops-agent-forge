"""Builder service — generates and refines Agent MD definitions using Claude API."""

import logging
from typing import Any

from anthropic import Anthropic

from app.config import settings
from app.services.validation_service import validate_agent_md

logger = logging.getLogger(__name__)

AGENT_MD_SCHEMA = """# Agent MD Schema Specification

Every agent is defined by a single Markdown document with these sections:

```markdown
# Agent: {agent_name}

## Metadata
- **Version:** {integer, starts at 1}
- **Author:** {creator email}
- **Created:** {ISO 8601 timestamp}
- **Status:** draft

## Description
{Free-text description of what this agent does and why it exists.}

## Persona
{The agent's personality and communication style.
Defines how it interacts with users and formats its outputs.}

## Instructions
{Step-by-step instructions for what the agent should do.}

### Steps
1. {First step}
2. {Second step}
3. {Third step}

### Decision Logic
- **If** {condition}: {action}
- **If** {condition}: {action}
- **Default:** {fallback action}

## Tools
- **{tool_name}**: {how/why this agent uses it}

## Schedule
- **Type:** {cron | webhook | manual | event}
- **Expression:** {cron expression, if type=cron}
- **Webhook Path:** {path, if type=webhook}
- **Event Source:** {source, if type=event}

## Inputs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| {name} | {type} | {yes/no} | {description} |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| {name} | {type} | {description} |

## Constraints
- Max LLM calls: {number, default 50}
- Max execution time: {seconds, default 300}
- Max tokens per call: {number, default 4096}
- Retry on failure: {yes/no, default no}
- Max retries: {number, default 3}

## Tags
{Comma-separated tags for categorization and search.}
```

IMPORTANT RULES:
- The agent name MUST be in the `# Agent: {name}` heading format
- Tools MUST be referenced by exact name from the available tools list
- Schedule type must be one of: cron, webhook, manual, event
- Steps should be clear, numbered, and actionable
- Decision Logic should cover edge cases and error handling
- Constraints should be reasonable (max_llm_calls <= 100, max_execution_time <= 600)
- Always include a Persona section for consistent agent behavior
- Always include Constraints to prevent runaway executions
- Always include Tags for categorization
- Set status to "draft" for new agents
"""

BUILDER_SYSTEM_PROMPT = f"""You are the AgentForge Builder AI. Your job is to create and refine Agent MD definitions based on user requests.

{AGENT_MD_SCHEMA}

When generating an agent definition:
1. Ask clarifying questions ONLY if the request is truly ambiguous. Otherwise, make reasonable decisions.
2. Always produce a COMPLETE, valid Agent MD document.
3. Choose appropriate tools from the available tools list.
4. Set sensible defaults for schedule, constraints, and other fields.
5. Write clear, actionable steps in the Instructions section.
6. Include Decision Logic for error handling and edge cases.

When refining an existing definition:
1. Preserve unchanged sections.
2. Only modify sections relevant to the user's request.
3. Explain what you changed and why.

Your response must contain EXACTLY ONE markdown code block with the complete Agent MD definition.
After the code block, provide a brief explanation of what the agent does and any design decisions you made.
"""


def _build_tools_context(available_tools: list[dict[str, Any]]) -> str:
    """Format available tools for the system prompt."""
    if not available_tools:
        return "No tools are currently available in the registry."

    lines = ["Available tools in the registry:\n"]
    for tool in available_tools:
        name = tool.get("name", "unknown")
        desc = tool.get("description", "No description")
        tier = tool.get("tier", "read_only")
        lines.append(f"- **{name}** ({tier}): {desc}")
    return "\n".join(lines)


def _build_messages(
    prompt: str,
    conversation_history: list[dict[str, str]],
    current_definition: str | None,
) -> list[dict[str, str]]:
    """Build the messages array for the Claude API call."""
    messages: list[dict[str, str]] = []

    # Add conversation history
    for msg in conversation_history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    # Build current user message
    user_content = prompt
    if current_definition:
        user_content = (
            f"Here is the current Agent MD definition:\n\n"
            f"```markdown\n{current_definition}\n```\n\n"
            f"User request: {prompt}"
        )

    messages.append({"role": "user", "content": user_content})
    return messages


def _extract_definition(response_text: str) -> str | None:
    """Extract the Agent MD definition from the response text."""
    # Look for markdown code block
    import re

    # Try ```markdown ... ``` first
    match = re.search(r"```markdown\s*\n(.*?)```", response_text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Try ``` ... ``` (generic code block)
    match = re.search(r"```\s*\n(.*?)```", response_text, re.DOTALL)
    if match:
        content = match.group(1).strip()
        # Verify it looks like Agent MD
        if content.startswith("# Agent:"):
            return content

    # Try to find raw Agent MD (no code block)
    match = re.search(r"(# Agent:.*?)(?=\n\n---|\Z)", response_text, re.DOTALL)
    if match:
        return match.group(1).strip()

    return None


def _extract_explanation(response_text: str, definition: str) -> str:
    """Extract the explanation text (everything outside the code block)."""
    # Remove the code block containing the definition
    import re

    cleaned = re.sub(r"```(?:markdown)?\s*\n.*?```", "", response_text, flags=re.DOTALL)
    explanation = cleaned.strip()
    return explanation if explanation else "Agent definition generated successfully."


def _extract_tools_used(definition: str) -> list[str]:
    """Extract tool names referenced in the definition."""
    import re

    tools = re.findall(r"\*\*(\w+)\*\*:", definition)
    known_tools = {
        "salesforce_query", "sf_record_update", "slack_notify",
        "email_send", "google_sheets_read",
    }
    return [t for t in tools if t in known_tools]


async def generate_agent(
    prompt: str,
    conversation_history: list[dict[str, str]] | None = None,
    current_definition: str | None = None,
    available_tools: list[dict[str, Any]] | None = None,
    business_context: str | None = None,
) -> dict[str, Any]:
    """Generate or refine an Agent MD definition using Claude.

    Args:
        prompt: User's natural language description or refinement request.
        conversation_history: Prior messages in this builder session.
        current_definition: Existing Agent MD to refine (None for new agents).
        available_tools: Tool registry entries for context.

    Returns:
        Dict with definition_md, explanation, tools_used, warnings, suggestions.
    """
    if conversation_history is None:
        conversation_history = []
    if available_tools is None:
        available_tools = []

    # Build system prompt with tools context and business context
    tools_context = _build_tools_context(available_tools)
    system_prompt = f"{BUILDER_SYSTEM_PROMPT}\n\n{tools_context}"
    if business_context:
        system_prompt += f"\n\n{business_context}"

    # Build messages
    messages = _build_messages(prompt, conversation_history, current_definition)

    # Call Claude API
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=messages,
    )

    # Extract text from response
    response_text = ""
    for block in response.content:
        if block.type == "text":
            response_text += block.text

    # Parse the response
    definition = _extract_definition(response_text)
    if definition is None:
        # Fallback: the entire response might be the definition
        logger.warning("Could not extract Agent MD from response, using raw text")
        return {
            "definition_md": response_text,
            "explanation": "Generated agent definition (could not parse structured response).",
            "tools_used": [],
            "warnings": ["Could not parse structured response from builder AI"],
            "suggestions": [],
        }

    explanation = _extract_explanation(response_text, definition)
    tools_used = _extract_tools_used(definition)

    # Auto-validate the produced MD
    validation = validate_agent_md(definition)
    warnings = validation.get("warnings", [])
    suggestions = validation.get("suggestions", [])

    # Add validation errors as warnings (generation still succeeded)
    for error in validation.get("errors", []):
        warnings.append(f"Validation: {error}")

    return {
        "definition_md": definition,
        "explanation": explanation,
        "tools_used": tools_used,
        "warnings": warnings,
        "suggestions": suggestions,
    }
