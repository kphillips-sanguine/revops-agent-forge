"""Gemini client wrapper — adapts Google GenAI SDK for the AgentForge executor."""

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)


def _create_client() -> genai.Client:
    """Create a Gemini client instance."""
    return genai.Client(api_key=settings.GOOGLE_API_KEY)


def _convert_tools_to_gemini(claude_tools: list[dict[str, Any]]) -> list[types.Tool]:
    """Convert Claude-format tool definitions to Gemini FunctionDeclaration format."""
    if not claude_tools:
        return []

    declarations: list[types.FunctionDeclaration] = []
    for tool in claude_tools:
        # Claude tool format: {name, description, input_schema: {type, properties, required}}
        schema = tool.get("input_schema", {})
        properties: dict[str, Any] = {}

        for prop_name, prop_def in schema.get("properties", {}).items():
            prop_type = prop_def.get("type", "STRING").upper()
            type_map = {
                "STRING": "STRING",
                "INTEGER": "INTEGER",
                "NUMBER": "NUMBER",
                "BOOLEAN": "BOOLEAN",
                "ARRAY": "ARRAY",
                "OBJECT": "OBJECT",
            }
            properties[prop_name] = types.Schema(
                type=type_map.get(prop_type, "STRING"),
                description=prop_def.get("description", ""),
            )

        params = types.Schema(
            type="OBJECT",
            properties=properties,
            required=schema.get("required", []),
        ) if properties else None

        declarations.append(types.FunctionDeclaration(
            name=tool["name"],
            description=tool.get("description", ""),
            parameters=params,
        ))

    return [types.Tool(function_declarations=declarations)]


def _convert_messages_to_gemini(
    system_prompt: str,
    messages: list[dict[str, Any]],
) -> tuple[str, list[types.Content]]:
    """Convert Claude-format messages to Gemini Content format.
    
    Returns (system_instruction, contents).
    """
    contents: list[types.Content] = []

    for msg in messages:
        role = msg["role"]
        content = msg.get("content", "")

        if role == "user":
            if isinstance(content, str):
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=content)],
                ))
            elif isinstance(content, list):
                # Tool results from Claude format
                parts: list[types.Part] = []
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "tool_result":
                        parts.append(types.Part.from_function_response(
                            name=item.get("tool_use_id", "unknown"),
                            response={"result": item.get("content", "")},
                        ))
                    elif isinstance(item, str):
                        parts.append(types.Part.from_text(text=item))
                if parts:
                    contents.append(types.Content(role="user", parts=parts))

        elif role == "assistant":
            if isinstance(content, str):
                contents.append(types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=content)],
                ))
            elif isinstance(content, list):
                parts = []
                for block in content:
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            parts.append(types.Part.from_text(text=block["text"]))
                        elif block.get("type") == "tool_use":
                            parts.append(types.Part.from_function_call(
                                name=block["name"],
                                args=block.get("input", {}),
                            ))
                if parts:
                    contents.append(types.Content(role="model", parts=parts))

    return system_prompt, contents


class GeminiResponse:
    """Adapter to make Gemini responses look like Anthropic responses for the executor."""

    def __init__(self, response: types.GenerateContentResponse):
        self._response = response
        self.content: list[Any] = []
        self.stop_reason: str = "end_turn"
        self.usage = _Usage(response)

        # Parse response parts
        if response.candidates and response.candidates[0].content:
            for part in response.candidates[0].content.parts:
                if part.text is not None:
                    self.content.append(_TextBlock(part.text))
                elif part.function_call is not None:
                    self.content.append(_ToolUseBlock(
                        id=f"toolu_{part.function_call.name}_{id(part)}",
                        name=part.function_call.name,
                        input=dict(part.function_call.args) if part.function_call.args else {},
                    ))
                    self.stop_reason = "tool_use"


class _TextBlock:
    def __init__(self, text: str):
        self.type = "text"
        self.text = text


class _ToolUseBlock:
    def __init__(self, id: str, name: str, input: dict):
        self.type = "tool_use"
        self.id = id
        self.name = name
        self.input = input


class _Usage:
    def __init__(self, response: types.GenerateContentResponse):
        usage = response.usage_metadata
        self.input_tokens = usage.prompt_token_count if usage else 0
        self.output_tokens = usage.candidates_token_count if usage else 0


def create_message(
    model_id: str,
    max_tokens: int,
    system: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
) -> GeminiResponse:
    """Create a Gemini message, returning an Anthropic-compatible response object."""
    client = _create_client()

    system_instruction, contents = _convert_messages_to_gemini(system, messages)
    gemini_tools = _convert_tools_to_gemini(tools) if tools else None

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        max_output_tokens=max_tokens,
        temperature=0.7,
    )
    if gemini_tools:
        config.tools = gemini_tools

    response = client.models.generate_content(
        model=model_id,
        contents=contents,
        config=config,
    )

    return GeminiResponse(response)
