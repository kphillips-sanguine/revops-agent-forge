"""Validate Agent MD definitions against the schema."""

from app.runtime.md_parser import parse_agent_md

REQUIRED_SECTIONS = ["name", "description", "instructions", "tools", "schedule"]


def validate_agent_md(definition_md: str) -> dict:
    """Validate an Agent MD definition.

    Returns:
        Dict with is_valid, errors, warnings, and suggestions.
    """
    errors: list[str] = []
    warnings: list[str] = []
    suggestions: list[str] = []

    if not definition_md or len(definition_md.strip()) < 50:
        errors.append("Definition is too short (minimum 50 characters)")
        return {
            "is_valid": False,
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions,
        }

    # Parse the MD
    try:
        config = parse_agent_md(definition_md)
    except Exception as e:
        errors.append(f"Failed to parse Agent MD: {e}")
        return {
            "is_valid": False,
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions,
        }

    # Check required sections
    if not config.get("name"):
        errors.append("Missing required '# Agent: {name}' heading")

    if not config.get("description"):
        errors.append("Missing or empty '## Description' section")

    instructions = config.get("instructions", {})
    if not instructions.get("steps") and not instructions.get("preamble"):
        errors.append("Missing or empty '## Instructions' section — at least steps or a preamble is required")

    if not config.get("tools"):
        warnings.append("No tools defined in '## Tools' section — agent will have no tool access")

    if not config.get("schedule"):
        warnings.append("No schedule defined — agent can only be triggered manually")

    # Validate instructions
    if instructions.get("steps"):
        if len(instructions["steps"]) > 20:
            warnings.append(
                f"Agent has {len(instructions['steps'])} steps — consider simplifying"
            )

    # Validate tools section
    for tool in config.get("tools", []):
        if not tool.get("name"):
            errors.append("Tool entry missing name")
        if not tool.get("usage_description"):
            warnings.append(f"Tool '{tool.get('name', '?')}' has no usage description")

    # Validate schedule
    schedule = config.get("schedule", {})
    if schedule:
        schedule_type = schedule.get("type", "")
        if schedule_type and schedule_type not in ("cron", "webhook", "manual", "event"):
            errors.append(
                f"Invalid schedule type '{schedule_type}' — must be cron, webhook, manual, or event"
            )
        if schedule_type == "cron" and not schedule.get("expression"):
            errors.append("Schedule type is 'cron' but no expression provided")
        if schedule_type == "webhook" and not schedule.get("webhook_path"):
            warnings.append("Schedule type is 'webhook' but no webhook path specified")

    # Validate constraints
    constraints = config.get("constraints", {})
    if constraints:
        max_llm = constraints.get("max_llm_calls")
        if max_llm is not None and isinstance(max_llm, int):
            if max_llm > 100:
                warnings.append(
                    f"max_llm_calls={max_llm} exceeds hard cap of 100 — will be clamped"
                )
            if max_llm < 1:
                errors.append("max_llm_calls must be at least 1")

        max_time = constraints.get("max_execution_time")
        if max_time is not None and isinstance(max_time, int):
            if max_time > 600:
                warnings.append(
                    f"max_execution_time={max_time}s exceeds hard cap of 600s — will be clamped"
                )

    # Suggestions
    if not config.get("persona"):
        suggestions.append("Consider adding a '## Persona' section to define the agent's communication style")

    if not config.get("constraints"):
        suggestions.append(
            "Consider adding a '## Constraints' section to set execution limits"
        )

    if not config.get("tags"):
        suggestions.append("Consider adding '## Tags' for easier categorization and search")

    if not instructions.get("decision_logic"):
        suggestions.append(
            "Consider adding '### Decision Logic' for conditional behavior"
        )

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "suggestions": suggestions,
    }
