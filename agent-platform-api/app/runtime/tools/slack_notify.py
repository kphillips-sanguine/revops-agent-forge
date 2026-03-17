"""Slack notification tool — sends messages to Slack channels via API."""

import logging
from typing import Any

import httpx

from app.config import settings
from app.runtime.tools.base import BaseTool

logger = logging.getLogger(__name__)


class SlackNotifyTool(BaseTool):
    name = "slack_notify"
    description = (
        "Send a message to a Slack channel. Supports Slack markdown formatting "
        "and thread replies."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "channel": {
                "type": "string",
                "description": "Slack channel name (e.g. #finance, #general)",
            },
            "message": {
                "type": "string",
                "description": "Message text (supports Slack markdown)",
            },
            "thread_ts": {
                "type": "string",
                "description": "Thread timestamp for replies (optional)",
            },
        },
        "required": ["channel", "message"],
    }

    def __init__(self, execution_id: str | None = None, rate_limit: int = 5):
        super().__init__(execution_id=execution_id, rate_limit=rate_limit)
        self.timeout_seconds = 10

    async def execute(self, params: dict[str, Any]) -> Any:
        channel = params["channel"]
        message = params["message"]
        thread_ts = params.get("thread_ts")

        token = settings.SLACK_BOT_TOKEN
        if not token:
            logger.warning("No SLACK_BOT_TOKEN configured — logging message instead")
            return {
                "ok": True,
                "channel": channel,
                "message_preview": message[:100],
                "mode": "dry_run",
                "note": "No Slack token configured; message was not sent.",
            }

        payload: dict[str, Any] = {
            "channel": channel,
            "text": message,
        }
        if thread_ts:
            payload["thread_ts"] = thread_ts

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            data = resp.json()

        if not data.get("ok"):
            raise RuntimeError(f"Slack API error: {data.get('error', 'unknown')}")

        return {
            "ok": True,
            "channel": data.get("channel"),
            "ts": data.get("ts"),
            "message_preview": message[:100],
        }
