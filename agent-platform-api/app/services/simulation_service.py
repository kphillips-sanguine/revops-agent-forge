"""Simulation service — dry-runs agents with mock tool responses."""

import logging
import time
from typing import Any
from uuid import uuid4

from app.runtime.md_parser import parse_agent_md
from app.runtime.tools.base import BaseTool

logger = logging.getLogger(__name__)

# Realistic mock data for each tool type
MOCK_TOOL_OUTPUTS: dict[str, dict[str, Any]] = {
    "salesforce_query": {
        "totalSize": 5,
        "done": True,
        "records": [
            {"Id": "001xx000003DGb1AAG", "Name": "Acme Corp", "Amount": 15000.00},
            {"Id": "001xx000003DGb2AAG", "Name": "TechStart Inc", "Amount": 8500.00},
            {"Id": "001xx000003DGb3AAG", "Name": "Global Services", "Amount": 22000.00},
            {"Id": "001xx000003DGb4AAG", "Name": "DataFlow LLC", "Amount": 5200.00},
            {"Id": "001xx000003DGb5AAG", "Name": "CloudFirst Ltd", "Amount": 31000.00},
        ],
    },
    "sf_record_update": {
        "id": "001xx000003DGb1AAG",
        "success": True,
        "errors": [],
    },
    "slack_notify": {
        "ok": True,
        "channel": "C0XXXXXXXXX",
        "ts": "1626876543.000100",
        "message": {"text": "Message delivered successfully"},
    },
    "email_send": {
        "message_id": "sim_email_001",
        "status": "sent",
        "recipients": 1,
    },
    "google_sheets_read": {
        "range": "Sheet1!A1:D10",
        "majorDimension": "ROWS",
        "values": [
            ["Name", "Q1", "Q2", "Q3"],
            ["Product A", "15000", "18000", "22000"],
            ["Product B", "8000", "9500", "11000"],
            ["Product C", "3200", "4100", "5800"],
        ],
    },
}

MOCK_INPUT_SUMMARIES: dict[str, str] = {
    "salesforce_query": "SOQL query for records",
    "sf_record_update": "Update Salesforce record",
    "slack_notify": "Send Slack notification",
    "email_send": "Send email notification",
    "google_sheets_read": "Read Google Sheets data",
}


class MockTool(BaseTool):
    """A mock tool that returns realistic sample data instead of making real calls."""

    def __init__(self, tool_name: str, tool_description: str = ""):
        super().__init__(execution_id=f"sim_{uuid4().hex[:8]}", rate_limit=100)
        self.name = tool_name
        self.description = tool_description or f"Mock {tool_name} tool"
        self.input_schema = {"type": "object", "properties": {}}

    async def execute(self, params: dict[str, Any]) -> Any:
        """Return mock data for the tool."""
        return MOCK_TOOL_OUTPUTS.get(self.name, {"success": True, "simulated": True})


async def simulate_agent(
    definition_md: str,
    mock_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Simulate an agent execution with mock tool responses.

    Args:
        definition_md: The Agent MD definition to simulate.
        mock_inputs: Optional mock input context.

    Returns:
        Dict with status, timeline, output, tokens_used, warnings.
    """
    if mock_inputs is None:
        mock_inputs = {}

    warnings: list[str] = []
    timeline: list[dict[str, Any]] = []
    start_time = time.time()

    # Step 1: Parse the definition
    try:
        config = parse_agent_md(definition_md)
    except Exception as e:
        return {
            "status": "failed",
            "timeline": [{
                "step": 1,
                "action": "parse",
                "status": "failed",
                "error": f"Failed to parse Agent MD: {e}",
                "duration_ms": int((time.time() - start_time) * 1000),
                "timestamp": _iso_now(),
            }],
            "output": None,
            "tokens_used": 0,
            "warnings": [f"Parse error: {e}"],
        }

    agent_name = config.get("name", "Unknown Agent")

    # Timeline: start
    timeline.append({
        "step": 1,
        "action": "start",
        "status": "success",
        "message": f"Starting simulation of '{agent_name}'",
        "duration_ms": 0,
        "timestamp": _iso_now(),
    })

    # Step 2: Identify tools and create mock instances
    tools_config = config.get("tools", [])
    mock_tools: list[MockTool] = []
    for tool_conf in tools_config:
        tool_name = tool_conf.get("name", "")
        if tool_name:
            mock_tools.append(MockTool(tool_name))

    if not mock_tools:
        warnings.append("No tools defined — simulation will be limited")

    timeline.append({
        "step": 2,
        "action": "tool_load",
        "status": "success",
        "message": f"Loaded {len(mock_tools)} mock tool(s): {', '.join(t.name for t in mock_tools)}",
        "duration_ms": 5,
        "timestamp": _iso_now(),
    })

    # Step 3: Simulate tool calls based on instructions
    simulated_tokens = 0
    tool_call_results: list[dict[str, Any]] = []

    for i, mock_tool in enumerate(mock_tools):
        step_start = time.time()

        # Simulate the tool call
        try:
            result = await mock_tool.safe_execute(mock_inputs)
            step_duration = int((time.time() - step_start) * 1000) + 50  # Add simulated latency

            tool_call_entry = {
                "tool_name": mock_tool.name,
                "input_summary": MOCK_INPUT_SUMMARIES.get(mock_tool.name, "Execute tool"),
                "input": mock_inputs,
                "output": result,
                "status": "success",
                "duration_ms": step_duration,
            }
            tool_call_results.append(tool_call_entry)

            timeline.append({
                "step": 3 + i,
                "action": "tool_call",
                "status": "success",
                "tool_name": mock_tool.name,
                "message": f"[SIMULATED] {mock_tool.name}: {MOCK_INPUT_SUMMARIES.get(mock_tool.name, 'executed')}",
                "duration_ms": step_duration,
                "timestamp": _iso_now(),
                "tool_call": tool_call_entry,
            })

            # Estimate tokens for processing each tool result
            simulated_tokens += 500

        except Exception as e:
            timeline.append({
                "step": 3 + i,
                "action": "tool_call",
                "status": "failed",
                "tool_name": mock_tool.name,
                "message": f"[SIMULATED] {mock_tool.name} failed: {e}",
                "duration_ms": int((time.time() - step_start) * 1000),
                "timestamp": _iso_now(),
            })
            warnings.append(f"Tool '{mock_tool.name}' failed in simulation: {e}")

    # Step 4: Simulated LLM processing
    simulated_tokens += 800  # Base tokens for system prompt + instructions
    timeline.append({
        "step": 3 + len(mock_tools),
        "action": "llm_call",
        "status": "success",
        "message": "[SIMULATED] LLM processing tool results and generating output",
        "duration_ms": 200,
        "timestamp": _iso_now(),
    })

    # Step 5: Generate simulated output
    steps = config.get("instructions", {}).get("steps", [])
    output_summary = (
        f"Simulation complete for '{agent_name}'. "
        f"Processed {len(mock_tools)} tool call(s) across {len(steps)} instruction step(s). "
        f"All tools returned mock data successfully."
    )

    timeline.append({
        "step": 4 + len(mock_tools),
        "action": "complete",
        "status": "success",
        "message": output_summary,
        "duration_ms": int((time.time() - start_time) * 1000),
        "timestamp": _iso_now(),
    })

    return {
        "status": "success",
        "timeline": timeline,
        "output": {
            "summary": output_summary,
            "tool_calls": tool_call_results,
            "agent_name": agent_name,
        },
        "tokens_used": simulated_tokens,
        "warnings": warnings,
    }


def _iso_now() -> str:
    """Return current UTC time as ISO 8601 string."""
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
