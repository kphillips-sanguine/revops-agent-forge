"""Model registry — defines available LLM models and their capabilities."""

import re
from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class ModelInfo:
    id: str
    display_name: str
    provider: str  # "anthropic" | "google"
    model_id: str  # API model identifier
    max_tokens: int
    cost_per_1k_input: float
    cost_per_1k_output: float
    supports_tools: bool
    recommended_for: str
    complexity_tier: str  # "simple" | "moderate" | "complex"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


AVAILABLE_MODELS: dict[str, ModelInfo] = {
    "claude-sonnet": ModelInfo(
        id="claude-sonnet",
        display_name="Claude Sonnet 4",
        provider="anthropic",
        model_id="claude-sonnet-4-20250514",
        max_tokens=8192,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        supports_tools=True,
        recommended_for="Complex multi-step agents with tool use, nuanced reasoning",
        complexity_tier="complex",
    ),
    "gemini-pro": ModelInfo(
        id="gemini-pro",
        display_name="Gemini 2.5 Pro",
        provider="google",
        model_id="gemini-2.5-pro-preview-06-05",
        max_tokens=8192,
        cost_per_1k_input=0.00125,
        cost_per_1k_output=0.01,
        supports_tools=True,
        recommended_for="Complex reasoning tasks, long context, cost-effective alternative to Sonnet",
        complexity_tier="complex",
    ),
    "gemini-flash": ModelInfo(
        id="gemini-flash",
        display_name="Gemini 2.5 Flash",
        provider="google",
        model_id="gemini-2.5-flash-preview-05-20",
        max_tokens=8192,
        cost_per_1k_input=0.00015,
        cost_per_1k_output=0.0006,
        supports_tools=True,
        recommended_for="Simple agents, high-volume tasks, fast execution, lowest cost",
        complexity_tier="simple",
    ),
}

DEFAULT_MODEL = "claude-sonnet"


def get_model(model_id: str) -> ModelInfo | None:
    """Get a model by its registry ID."""
    return AVAILABLE_MODELS.get(model_id)


def list_models() -> list[dict[str, Any]]:
    """Return all available models as dicts."""
    return [m.to_dict() for m in AVAILABLE_MODELS.values()]


def recommend_model(agent_md: str) -> dict[str, Any]:
    """Analyze agent definition complexity and recommend a model.

    Returns dict with recommended_model_id, reason, complexity, and complexity_score.
    """
    score = 0
    reasons: list[str] = []

    lines_lower = agent_md.lower()

    # Tool count (bold items in Tools section)
    tool_matches = re.findall(r"- \*\*(\w+)\*\*:", agent_md)
    tool_count = len(tool_matches)
    if tool_count >= 4:
        score += 3
        reasons.append(f"{tool_count} tools referenced")
    elif tool_count >= 2:
        score += 1
        reasons.append(f"{tool_count} tools referenced")

    # Steps count
    steps = re.findall(r"^\d+\.", agent_md, re.MULTILINE)
    if len(steps) >= 6:
        score += 3
        reasons.append(f"{len(steps)} instruction steps")
    elif len(steps) >= 3:
        score += 1

    # Decision logic
    if "### decision logic" in lines_lower:
        score += 2
        reasons.append("Has decision logic")

    # Schedule complexity
    if "cron" in lines_lower or "event" in lines_lower:
        score += 1

    # Sensitive/write tools
    if "sensitive" in lines_lower or "sf_record_update" in lines_lower:
        score += 2
        reasons.append("Uses write/sensitive tools")

    # Definition length
    if len(agent_md) > 2000:
        score += 1
    if len(agent_md) > 4000:
        score += 1

    # Map score to recommendation
    if score >= 5:
        model_id = "claude-sonnet"
        complexity = "complex"
        reason = "Complex agent — Claude Sonnet provides the best reasoning for multi-step workflows with tool use."
    elif score >= 2:
        model_id = "gemini-pro"
        complexity = "moderate"
        reason = "Moderate complexity — Gemini Pro offers strong reasoning at lower cost."
    else:
        model_id = "gemini-flash"
        complexity = "simple"
        reason = "Simple agent — Gemini Flash is fast and cost-effective for straightforward tasks."

    if reasons:
        reason += f" (Factors: {', '.join(reasons)})"

    return {
        "recommended_model_id": model_id,
        "complexity": complexity,
        "complexity_score": score,
        "reason": reason,
    }
