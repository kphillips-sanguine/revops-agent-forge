"""Parse Agent MD definitions into structured configuration dicts."""

import re
from typing import Any


def parse_agent_md(md_content: str) -> dict[str, Any]:
    """Parse an Agent MD definition into structured configuration.

    Returns a dict with keys: name, metadata, description, persona,
    instructions, tools, schedule, inputs, outputs, constraints, tags.
    """
    config: dict[str, Any] = {
        "name": None,
        "metadata": {},
        "description": "",
        "persona": "",
        "instructions": {"preamble": "", "steps": [], "decision_logic": []},
        "tools": [],
        "schedule": {},
        "inputs": [],
        "outputs": [],
        "constraints": {},
        "tags": [],
    }

    # Extract agent name from H1
    h1_match = re.search(r"^# Agent:\s*(.+)$", md_content, re.MULTILINE)
    if h1_match:
        config["name"] = h1_match.group(1).strip()

    # Split into sections by H2
    sections = re.split(r"^## ", md_content, flags=re.MULTILINE)

    for section in sections[1:]:  # Skip content before first H2
        lines = section.strip().split("\n")
        section_name = lines[0].strip().lower()
        section_body = "\n".join(lines[1:]).strip()

        if section_name == "metadata":
            config["metadata"] = _parse_metadata(section_body)
        elif section_name == "description":
            config["description"] = section_body
        elif section_name == "persona":
            config["persona"] = section_body
        elif section_name.startswith("instruction"):
            config["instructions"] = _parse_instructions(section_body)
        elif section_name == "tools":
            config["tools"] = _parse_tools(section_body)
        elif section_name == "schedule":
            config["schedule"] = _parse_metadata(section_body)
        elif section_name == "inputs":
            config["inputs"] = _parse_table(section_body)
        elif section_name == "outputs":
            config["outputs"] = _parse_table(section_body)
        elif section_name == "constraints":
            config["constraints"] = _parse_constraints(section_body)
        elif section_name == "tags":
            config["tags"] = [t.strip() for t in section_body.split(",") if t.strip()]

    return config


def _parse_metadata(body: str) -> dict[str, str]:
    """Parse key-value list items like '- **Key:** Value'."""
    result: dict[str, str] = {}
    for match in re.finditer(r"-\s*\*\*(.+?)\*\*:?\s*(.+)", body):
        key = match.group(1).strip().lower().replace(" ", "_")
        value = match.group(2).strip()
        result[key] = value
    return result


def _parse_instructions(body: str) -> dict[str, Any]:
    """Parse instructions section with Steps and Decision Logic subsections."""
    result: dict[str, Any] = {"preamble": "", "steps": [], "decision_logic": []}

    # Split by H3
    subsections = re.split(r"^### ", body, flags=re.MULTILINE)

    # Preamble (before first H3)
    if subsections[0].strip():
        result["preamble"] = subsections[0].strip()

    for sub in subsections[1:]:
        sub_lines = sub.strip().split("\n")
        sub_name = sub_lines[0].strip().lower()
        sub_body = "\n".join(sub_lines[1:]).strip()

        if sub_name == "steps":
            # Parse numbered list (handle multi-line steps)
            result["steps"] = re.findall(r"^\d+\.\s*(.+)", sub_body, re.MULTILINE)

        elif sub_name.startswith("decision"):
            # Parse conditional rules
            for match in re.finditer(
                r"-\s*\*\*(If|Default)\*\*:?\s*(.+?):\s*(.+)", sub_body
            ):
                result["decision_logic"].append(
                    {
                        "condition": match.group(2).strip()
                        if match.group(1) == "If"
                        else "default",
                        "action": match.group(3).strip(),
                    }
                )

    return result


def _parse_tools(body: str) -> list[dict[str, str]]:
    """Parse tool list items like '- **tool_name**: description'."""
    tools: list[dict[str, str]] = []
    for match in re.finditer(r"-\s*\*\*(.+?)\*\*:?\s*(.+)", body):
        tools.append(
            {
                "name": match.group(1).strip(),
                "usage_description": match.group(2).strip(),
            }
        )
    return tools


def _parse_table(body: str) -> list[dict[str, str]]:
    """Parse markdown table into list of dicts."""
    rows: list[dict[str, str]] = []
    lines = [
        line.strip()
        for line in body.split("\n")
        if line.strip() and not line.strip().startswith("|---")
    ]
    if not lines:
        return rows

    # Get headers from first row
    headers = [h.strip() for h in lines[0].split("|")[1:-1]]

    for line in lines[1:]:
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))

    return rows


def _parse_constraints(body: str) -> dict[str, Any]:
    """Parse constraints as key-value pairs."""
    constraints: dict[str, Any] = {}
    mapping = {
        "max llm calls": "max_llm_calls",
        "max execution time": "max_execution_time",
        "max tokens per call": "max_tokens_per_call",
        "retry on failure": "retry_on_failure",
        "max retries": "max_retries",
    }
    for match in re.finditer(r"-\s*(.+?):\s*(.+)", body):
        key = match.group(1).strip().lower()
        value = match.group(2).strip()
        if key in mapping:
            if value.lower() in ("yes", "true"):
                constraints[mapping[key]] = True
            elif value.lower() in ("no", "false"):
                constraints[mapping[key]] = False
            else:
                try:
                    constraints[mapping[key]] = int(value)
                except ValueError:
                    constraints[mapping[key]] = value
    return constraints
