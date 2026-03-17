"""Salesforce SOQL query tool — executes read-only queries via SF CLI."""

import asyncio
import json
import logging
from typing import Any

from app.runtime.tools.base import BaseTool

logger = logging.getLogger(__name__)


class SalesforceQueryTool(BaseTool):
    name = "salesforce_query"
    description = (
        "Execute a read-only SOQL query against Salesforce. "
        "Returns query results as JSON. Cannot create, update, or delete records."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "soql": {
                "type": "string",
                "description": "SOQL query to execute (e.g. SELECT Id, Name FROM Account LIMIT 10)",
            },
            "org": {
                "type": "string",
                "description": "Target Salesforce org alias",
                "enum": ["prod"],
                "default": "prod",
            },
        },
        "required": ["soql"],
    }

    def __init__(self, execution_id: str | None = None, rate_limit: int = 20):
        super().__init__(execution_id=execution_id, rate_limit=rate_limit)
        self.timeout_seconds = 30

    async def execute(self, params: dict[str, Any]) -> Any:
        soql = params["soql"]
        org = params.get("org", "prod")

        cmd = f'sf data query --query "{soql}" --target-org {org} --json'
        logger.info("Executing SF query: %s", soql[:200])

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=self.timeout_seconds
            )

            if process.returncode != 0:
                error_text = stderr.decode("utf-8", errors="replace").strip()
                raise RuntimeError(f"SF CLI error (exit {process.returncode}): {error_text}")

            result = json.loads(stdout.decode("utf-8"))
            return {
                "totalSize": result.get("result", {}).get("totalSize", 0),
                "records": result.get("result", {}).get("records", []),
                "done": result.get("result", {}).get("done", True),
            }

        except asyncio.TimeoutError:
            raise RuntimeError(f"Salesforce query timed out after {self.timeout_seconds}s")
