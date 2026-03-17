"""Email send tool — placeholder implementation that logs the email."""

import logging
from typing import Any

from app.runtime.tools.base import BaseTool

logger = logging.getLogger(__name__)


class EmailSendTool(BaseTool):
    name = "email_send"
    description = (
        "Send an email to specified recipients. Currently operates in "
        "log-only mode — emails are recorded but not actually sent."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "to": {
                "type": "string",
                "description": "Recipient email address",
            },
            "subject": {
                "type": "string",
                "description": "Email subject line",
            },
            "body": {
                "type": "string",
                "description": "Email body (plain text or HTML)",
            },
            "cc": {
                "type": "string",
                "description": "CC recipients (comma-separated, optional)",
            },
        },
        "required": ["to", "subject", "body"],
    }

    async def execute(self, params: dict[str, Any]) -> Any:
        to = params["to"]
        subject = params["subject"]
        body = params["body"]
        cc = params.get("cc", "")

        logger.info(
            "Email (log-only): to=%s subject=%s cc=%s body_length=%d",
            to,
            subject,
            cc,
            len(body),
        )

        return {
            "sent": False,
            "mode": "log_only",
            "to": to,
            "subject": subject,
            "body_preview": body[:200],
            "note": "Email recorded but not sent (placeholder implementation).",
        }
