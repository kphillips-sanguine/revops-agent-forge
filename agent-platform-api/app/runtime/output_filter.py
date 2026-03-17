"""PII detection and output sanitization for agent responses."""

import re
from typing import Any

# PII detection patterns: (regex, replacement)
# replacement=None means keep the match (e.g. emails are usually acceptable)
PII_PATTERNS: list[tuple[str, str | None]] = [
    # SSN (###-##-####)
    (r"\b\d{3}-\d{2}-\d{4}\b", "[SSN-REDACTED]"),
    # Credit card numbers (4 groups of 4 digits)
    (r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[CC-REDACTED]"),
    # Credentials (password=xxx, secret=xxx, token=xxx, api_key=xxx)
    (
        r"(?i)(password|secret|token|api.?key)\s*[:=]\s*\S+",
        "[CREDENTIAL-REDACTED]",
    ),
]


def filter_output(output: Any) -> Any:
    """Filter PII and sensitive data from agent output.

    Recursively processes dicts, lists, and strings. Non-string
    primitives are passed through unchanged.
    """
    if isinstance(output, dict):
        return {k: filter_output(v) for k, v in output.items()}
    if isinstance(output, list):
        return [filter_output(item) for item in output]
    if isinstance(output, str):
        return _filter_string(output)
    return output


def _filter_string(text: str) -> str:
    """Apply all PII patterns to a single string."""
    filtered = text
    for pattern, replacement in PII_PATTERNS:
        if replacement is not None:
            filtered = re.sub(pattern, replacement, filtered)
    return filtered
