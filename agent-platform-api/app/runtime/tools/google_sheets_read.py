"""Google Sheets read tool — placeholder that returns mock data."""

import logging
from typing import Any

from app.runtime.tools.base import BaseTool

logger = logging.getLogger(__name__)


class GoogleSheetsReadTool(BaseTool):
    name = "google_sheets_read"
    description = (
        "Read data from a Google Sheets spreadsheet. Currently returns "
        "mock data — Google Sheets integration is not yet configured."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "spreadsheet_id": {
                "type": "string",
                "description": "Google Sheets spreadsheet ID",
            },
            "range": {
                "type": "string",
                "description": "Cell range to read (e.g. Sheet1!A1:D10)",
            },
        },
        "required": ["spreadsheet_id", "range"],
    }

    async def execute(self, params: dict[str, Any]) -> Any:
        spreadsheet_id = params["spreadsheet_id"]
        cell_range = params["range"]

        logger.info(
            "Google Sheets read (mock): spreadsheet=%s range=%s",
            spreadsheet_id,
            cell_range,
        )

        return {
            "mode": "mock",
            "spreadsheet_id": spreadsheet_id,
            "range": cell_range,
            "values": [
                ["Header1", "Header2", "Header3"],
                ["Row1-A", "Row1-B", "Row1-C"],
                ["Row2-A", "Row2-B", "Row2-C"],
            ],
            "note": "Mock data returned — Google Sheets integration not configured.",
        }
