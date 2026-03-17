"""Salesforce record update tool — updates existing records via SF CLI."""

import asyncio
import json
import logging
from typing import Any

from app.runtime.tools.base import BaseTool

logger = logging.getLogger(__name__)


class SfRecordUpdateTool(BaseTool):
    name = "sf_record_update"
    description = (
        "Update an existing Salesforce record. Requires the SObject type, "
        "record ID, and a map of fields to update."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "object": {
                "type": "string",
                "description": "SObject API name (e.g. Account, Case, Invoice__c)",
            },
            "record_id": {
                "type": "string",
                "description": "18-character Salesforce record ID",
            },
            "fields": {
                "type": "object",
                "description": "Field:Value pairs to update (e.g. {\"Status\": \"Closed\"})",
            },
            "org": {
                "type": "string",
                "description": "Target Salesforce org alias",
                "enum": ["prod"],
                "default": "prod",
            },
        },
        "required": ["object", "record_id", "fields"],
    }

    def __init__(self, execution_id: str | None = None, rate_limit: int = 10):
        super().__init__(execution_id=execution_id, rate_limit=rate_limit)
        self.timeout_seconds = 15

    async def execute(self, params: dict[str, Any]) -> Any:
        sobject = params["object"]
        record_id = params["record_id"]
        fields = params["fields"]
        org = params.get("org", "prod")

        # Build field values string for SF CLI
        field_values = " ".join(f'{k}="{v}"' for k, v in fields.items())
        cmd = (
            f"sf data update record --sobject {sobject} "
            f"--record-id {record_id} --values {field_values} "
            f"--target-org {org} --json"
        )
        logger.info("Updating SF record: %s %s", sobject, record_id)

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
                "success": True,
                "id": result.get("result", {}).get("id", record_id),
                "object": sobject,
                "fields_updated": list(fields.keys()),
            }

        except asyncio.TimeoutError:
            raise RuntimeError(f"Salesforce update timed out after {self.timeout_seconds}s")
