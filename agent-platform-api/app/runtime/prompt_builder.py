"""Assemble system prompts from persona, instructions, guardrails, and input context."""

import json


def build_system_prompt(
    persona: str,
    instructions: dict,
    guardrails: str,
    input_context: dict,
) -> str:
    """Assemble the full system prompt for the Claude agent.

    Order of sections (highest priority first):
    1. Guardrails
    2. Persona
    3. Instructions (preamble + steps + decision logic)
    4. Input context (as JSON)
    5. Output format guidance
    """
    prompt_parts: list[str] = []

    # 1. Guardrails first (highest priority)
    prompt_parts.append(guardrails)

    # 2. Persona
    prompt_parts.append(f"## Your Persona\n{persona}")

    # 3. Instructions
    instructions_text = "## Your Instructions\n"
    if instructions.get("preamble"):
        instructions_text += f"{instructions['preamble']}\n\n"

    if instructions.get("steps"):
        instructions_text += "### Steps\n"
        for i, step in enumerate(instructions["steps"], 1):
            instructions_text += f"{i}. {step}\n"
        instructions_text += "\n"

    if instructions.get("decision_logic"):
        instructions_text += "### Decision Logic\n"
        for rule in instructions["decision_logic"]:
            if rule["condition"] == "default":
                instructions_text += f"- **Default:** {rule['action']}\n"
            else:
                instructions_text += f"- **If** {rule['condition']}: {rule['action']}\n"

    prompt_parts.append(instructions_text)

    # 4. Input context
    if input_context:
        context_text = "## Input Context\n"
        context_text += "The following data has been provided for this execution:\n\n"
        context_text += "```json\n"
        context_text += json.dumps(input_context, indent=2)
        context_text += "\n```\n"
        prompt_parts.append(context_text)

    # 5. Output instructions
    prompt_parts.append(
        "## Output Format\n"
        "When you have completed your task, provide your final response as a clear, "
        "structured summary. Include any relevant data, actions taken, and recommendations. "
        "If you encountered any issues or uncertainties, note them explicitly."
    )

    return "\n\n".join(prompt_parts)
