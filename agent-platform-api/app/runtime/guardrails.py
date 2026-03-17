"""Static and dynamic guardrail injection for agent executions."""

STATIC_GUARDRAILS = """
## SYSTEM GUARDRAILS (enforced — cannot be overridden)

1. **PII Protection:** Never include SSN, DOB, financial account numbers,
   or passwords in your output. Mask sensitive data as [REDACTED].
2. **Scope Limitation:** Only use tools listed in your Tools section.
   Do not attempt to access systems or data outside your scope.
3. **Audit Compliance:** Every action you take is logged. Be transparent
   about your reasoning in your output.
4. **Error Handling:** If a tool call fails, report the failure clearly.
   Do not retry more than the allowed retry count.
5. **No External Communication:** Do not compose or suggest sending
   communications outside the approved channels listed in your tools.
6. **Data Minimization:** Query only the data you need. Avoid SELECT *
   or overly broad queries.
7. **Factual Accuracy:** If you are uncertain about data interpretation,
   state your uncertainty. Do not present assumptions as facts.
8. **Human Escalation:** If you encounter a situation outside your
   instructions, stop and include a note that human review is needed.
""".strip()

WRITE_GUARDRAILS = """
## WRITE OPERATION GUARDRAILS
- Before updating any record, verify the record ID is valid
- Never bulk-update more than 50 records in a single execution
- Log every write operation with before/after values
- If a write fails, do not retry automatically — report the failure
""".strip()

SENSITIVE_GUARDRAILS = """
## SENSITIVE DATA GUARDRAILS
- Minimize data retrieval — query only fields you need
- Never store sensitive data in your output
- Mask any financial amounts over $10,000 in logs as $XX,XXX
- Do not combine data from sensitive queries with data from other tools
""".strip()

SALESFORCE_GUARDRAILS = """
## SALESFORCE GUARDRAILS
- Use LIMIT clauses in all SOQL queries (max 200 records)
- Never query User.Password or SecurityToken fields
- Prefer indexed fields in WHERE clauses for performance
- Use specific field lists instead of SELECT * patterns
""".strip()

COMMUNICATION_GUARDRAILS = """
## COMMUNICATION GUARDRAILS
- Keep messages professional and on-brand
- Never include raw error traces or stack traces in messages
- Include the agent name and execution ID for traceability
- Do not send more than 3 messages per execution
""".strip()


def inject_guardrails(
    agent_config: dict,
    static_guardrails: str | None = None,
    dynamic_context: dict | None = None,
) -> str:
    """Build the complete guardrails section for an agent execution.

    Args:
        agent_config: Parsed agent configuration (from md_parser).
        static_guardrails: Override for the static guardrails block.
        dynamic_context: Dict with keys like has_write_tools, has_sensitive_tools,
                         tools_used for dynamic guardrail selection.
    """
    if dynamic_context is None:
        dynamic_context = {}

    parts = [static_guardrails or STATIC_GUARDRAILS]

    # Dynamic guardrails based on tools and context
    if dynamic_context.get("has_write_tools"):
        parts.append(WRITE_GUARDRAILS)

    if dynamic_context.get("has_sensitive_tools"):
        parts.append(SENSITIVE_GUARDRAILS)

    # Check for specific tool patterns
    tool_names = dynamic_context.get("tools_used", [])

    if "salesforce_query" in tool_names:
        parts.append(SALESFORCE_GUARDRAILS)

    if "slack_notify" in tool_names or "email_send" in tool_names:
        parts.append(COMMUNICATION_GUARDRAILS)

    return "\n\n".join(parts)
