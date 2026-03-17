"""Abstract base class for all agent tools."""

from abc import ABC, abstractmethod
from typing import Any
import time
import logging

logger = logging.getLogger(__name__)


class BaseTool(ABC):
    """Base class for all tools available to agents.

    Subclasses must implement execute() and define name, description,
    and input_schema as class-level attributes.
    """

    name: str = ""
    description: str = ""
    input_schema: dict[str, Any] = {}

    def __init__(
        self,
        execution_id: str | None = None,
        rate_limit: int = 100,
    ):
        self.execution_id = execution_id
        self.rate_limit = rate_limit
        self._call_count = 0

    def to_claude_tool(self) -> dict[str, Any]:
        """Return the tool definition for the Anthropic messages API."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

    async def safe_execute(self, params: dict[str, Any]) -> Any:
        """Execute with rate limiting and logging."""
        self._call_count += 1
        if self._call_count > self.rate_limit:
            raise RuntimeError(
                f"Tool '{self.name}' exceeded rate limit of "
                f"{self.rate_limit} calls per execution"
            )

        start = time.time()
        try:
            result = await self.execute(params)
            duration_ms = int((time.time() - start) * 1000)
            logger.info(
                "Tool %s executed in %dms (call %d/%d)",
                self.name,
                duration_ms,
                self._call_count,
                self.rate_limit,
            )
            return result
        except Exception:
            duration_ms = int((time.time() - start) * 1000)
            logger.exception(
                "Tool %s failed after %dms (call %d/%d)",
                self.name,
                duration_ms,
                self._call_count,
                self.rate_limit,
            )
            raise

    @abstractmethod
    async def execute(self, params: dict[str, Any]) -> Any:
        """Execute the tool with the given parameters.

        Must be implemented by each tool subclass.
        Returns a JSON-serializable result.
        """
        ...
