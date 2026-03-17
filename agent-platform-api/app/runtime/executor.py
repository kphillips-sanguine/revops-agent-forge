"""Core agent execution engine using the Anthropic Python SDK (messages.create with tools)."""

import logging
import time
from typing import Any
from uuid import UUID

from anthropic import Anthropic

from app.config import settings
from app.runtime.guardrails import STATIC_GUARDRAILS, inject_guardrails
from app.runtime.md_parser import parse_agent_md
from app.runtime.output_filter import filter_output
from app.runtime.prompt_builder import build_system_prompt
from app.runtime.tool_loader import load_tools
from app.runtime.tools.base import BaseTool

logger = logging.getLogger(__name__)


class AgentExecutor:
    """Interprets Agent MD definitions and runs them via the Anthropic
    messages API with a tool-calling loop."""

    def __init__(
        self,
        tool_registry: list[dict[str, Any]],
    ):
        self.tool_registry = tool_registry
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def execute(
        self,
        agent_definition: dict[str, Any],
        input_context: dict[str, Any],
        execution_id: UUID,
        trigger_type: str = "manual",
    ) -> dict[str, Any]:
        """Main execution entry point.

        Args:
            agent_definition: Agent record dict with definition_md, tools_allowed, etc.
            input_context: Input data for this execution.
            execution_id: UUID of the execution record.
            trigger_type: How this execution was triggered.

        Returns:
            Dict with status, output, llm_calls, tokens_used, tool_calls, duration_seconds, error.
        """
        start_time = time.time()
        llm_calls = 0
        tokens_used = 0
        tool_call_logs: list[dict[str, Any]] = []

        try:
            # Step 1: Parse the Agent MD
            agent_config = parse_agent_md(agent_definition["definition_md"])

            # Step 2: Build allowed tools list with registry data
            allowed_tools = self._resolve_tools(
                agent_config["tools"],
                agent_definition.get("tools_allowed", []),
            )

            # Step 3: Build guardrails
            guardrails = inject_guardrails(
                agent_config=agent_config,
                static_guardrails=STATIC_GUARDRAILS,
                dynamic_context={
                    "tools_used": [t["name"] for t in allowed_tools],
                    "has_write_tools": any(
                        t.get("tier") == "write" for t in allowed_tools
                    ),
                    "has_sensitive_tools": any(
                        t.get("tier") == "sensitive" for t in allowed_tools
                    ),
                },
            )

            # Step 4: Build system prompt
            system_prompt = build_system_prompt(
                persona=agent_config.get(
                    "persona", "Professional and helpful assistant."
                ),
                instructions=agent_config["instructions"],
                guardrails=guardrails,
                input_context=input_context,
            )

            # Step 5: Load tool implementations
            rate_limits = self._get_rate_limits(allowed_tools)
            tool_implementations = load_tools(
                allowed_tools,
                self.tool_registry,
                execution_id=str(execution_id),
                rate_limits=rate_limits,
            )

            # Step 6: Get constraints
            constraints = agent_config.get("constraints", {})
            max_llm_calls = min(
                constraints.get("max_llm_calls", 50), 100
            )  # Hard cap
            max_execution_time = min(
                constraints.get("max_execution_time", 300), 600
            )  # Hard cap 10min
            max_tokens = min(
                constraints.get("max_tokens_per_call", 4096), 8192
            )

            # Step 7: Build initial messages
            messages: list[dict[str, Any]] = []
            if input_context:
                messages.append(
                    {
                        "role": "user",
                        "content": self._format_input_context(
                            input_context, agent_config
                        ),
                    }
                )
            else:
                messages.append(
                    {"role": "user", "content": "Execute your instructions now."}
                )

            result: Any = None

            # Step 8: Tool-calling loop
            claude_tools = (
                [t.to_claude_tool() for t in tool_implementations]
                if tool_implementations
                else []
            )

            while llm_calls < max_llm_calls:
                # Check timeout
                elapsed = time.time() - start_time
                if elapsed > max_execution_time:
                    raise TimeoutError(
                        f"Execution exceeded {max_execution_time}s limit"
                    )

                # Call Claude
                create_kwargs: dict[str, Any] = {
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": max_tokens,
                    "system": system_prompt,
                    "messages": messages,
                }
                if claude_tools:
                    create_kwargs["tools"] = claude_tools

                response = self.client.messages.create(**create_kwargs)

                llm_calls += 1
                tokens_used += (
                    response.usage.input_tokens + response.usage.output_tokens
                )

                # Process response
                if response.stop_reason == "end_turn":
                    result = self._extract_text_result(response)
                    break

                elif response.stop_reason == "tool_use":
                    tool_results: list[dict[str, Any]] = []
                    for content_block in response.content:
                        if content_block.type == "tool_use":
                            tool_log = await self._execute_tool_call(
                                content_block,
                                tool_implementations,
                                execution_id,
                                len(tool_call_logs) + 1,
                            )
                            tool_call_logs.append(tool_log)
                            tool_results.append(
                                {
                                    "type": "tool_result",
                                    "tool_use_id": content_block.id,
                                    "content": (
                                        str(tool_log["output"])
                                        if tool_log["status"] == "success"
                                        else f"Error: {tool_log['error']}"
                                    ),
                                }
                            )

                    # Serialize content blocks for the assistant message
                    assistant_content = []
                    for block in response.content:
                        if block.type == "text":
                            assistant_content.append(
                                {"type": "text", "text": block.text}
                            )
                        elif block.type == "tool_use":
                            assistant_content.append(
                                {
                                    "type": "tool_use",
                                    "id": block.id,
                                    "name": block.name,
                                    "input": block.input,
                                }
                            )

                    messages.append(
                        {"role": "assistant", "content": assistant_content}
                    )
                    messages.append({"role": "user", "content": tool_results})

                else:
                    # Unexpected stop reason
                    result = self._extract_text_result(response)
                    break

            # Step 9: Filter output
            if result is not None:
                result = filter_output(result)

            return {
                "status": "success",
                "output": result,
                "llm_calls": llm_calls,
                "tokens_used": tokens_used,
                "tool_calls": tool_call_logs,
                "duration_seconds": time.time() - start_time,
            }

        except TimeoutError as e:
            return {
                "status": "timeout",
                "error": str(e),
                "output": None,
                "llm_calls": llm_calls,
                "tokens_used": tokens_used,
                "tool_calls": tool_call_logs,
                "duration_seconds": time.time() - start_time,
            }

        except Exception as e:
            logger.exception("Agent execution failed: %s", e)
            return {
                "status": "failed",
                "error": str(e),
                "output": None,
                "llm_calls": llm_calls,
                "tokens_used": tokens_used,
                "tool_calls": tool_call_logs,
                "duration_seconds": time.time() - start_time,
            }

    async def _execute_tool_call(
        self,
        tool_block: Any,
        tool_implementations: list[BaseTool],
        execution_id: UUID,
        call_order: int,
    ) -> dict[str, Any]:
        """Execute a single tool call with logging and enforcement."""
        tool_name = tool_block.name
        tool_input = tool_block.input
        start = time.time()

        try:
            tool = next(
                (t for t in tool_implementations if t.name == tool_name), None
            )
            if not tool:
                return {
                    "tool_name": tool_name,
                    "input": tool_input,
                    "output": None,
                    "status": "blocked",
                    "error": f"Tool '{tool_name}' not in allowed list",
                    "duration_ms": 0,
                }

            output = await tool.safe_execute(tool_input)

            return {
                "tool_name": tool_name,
                "input": tool_input,
                "output": output,
                "status": "success",
                "error": None,
                "duration_ms": int((time.time() - start) * 1000),
            }

        except RuntimeError as e:
            # Rate limit exceeded or tool-specific errors
            error_str = str(e)
            status = "rate_limited" if "rate limit" in error_str.lower() else "failed"
            return {
                "tool_name": tool_name,
                "input": tool_input,
                "output": None,
                "status": status,
                "error": error_str,
                "duration_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            return {
                "tool_name": tool_name,
                "input": tool_input,
                "output": None,
                "status": "failed",
                "error": str(e),
                "duration_ms": int((time.time() - start) * 1000),
            }

    def _resolve_tools(
        self,
        md_tools: list[dict[str, str]],
        tools_allowed: list[str],
    ) -> list[dict[str, Any]]:
        """Merge tool info from the MD definition and registry."""
        resolved: list[dict[str, Any]] = []
        allowed_set = set(tools_allowed)
        registry_lookup = {t["name"]: t for t in self.tool_registry}

        for tool in md_tools:
            name = tool["name"]
            if name not in allowed_set:
                continue
            registry_entry = registry_lookup.get(name, {})
            resolved.append(
                {
                    "name": name,
                    "tier": registry_entry.get("tier", "read_only"),
                    "rate_limit_per_execution": registry_entry.get(
                        "rate_limit_per_execution", 100
                    ),
                    "enabled": registry_entry.get("enabled", True),
                }
            )
        return resolved

    def _get_rate_limits(
        self, allowed_tools: list[dict[str, Any]]
    ) -> dict[str, int]:
        """Extract rate limits from resolved tools."""
        return {
            t["name"]: t.get("rate_limit_per_execution", 100)
            for t in allowed_tools
        }

    def _format_input_context(
        self, input_context: dict[str, Any], agent_config: dict[str, Any]
    ) -> str:
        """Format input context as a user message."""
        import json

        parts = ["Here is the input data for this execution:"]
        parts.append(f"```json\n{json.dumps(input_context, indent=2)}\n```")
        parts.append("Please execute your instructions using this data.")
        return "\n\n".join(parts)

    def _extract_text_result(self, response: Any) -> str | dict[str, Any]:
        """Extract the text content from a Claude response."""
        text_parts: list[str] = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
        return "\n".join(text_parts) if text_parts else {"message": "No output"}
