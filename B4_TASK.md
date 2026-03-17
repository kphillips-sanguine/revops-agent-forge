Read PLAN.md and BACKEND_PHASES.md in this directory. Execute Phase B4 from BACKEND_PHASES.md.

Phases B1-B3 are complete in `agent-platform-api/`. The FastAPI scaffold, models, schemas, agent CRUD with lifecycle, tool registry, JWT auth, and all endpoints are implemented.

Build on top of the existing code. Do NOT re-create existing files unless modifying them.

Do NOT ask questions — make decisions and build.

Key requirements:
1. MD Parser (app/runtime/md_parser.py) — parse Agent MD definitions into structured dicts. Implementation from PLAN.md section 6.2
2. Prompt Builder (app/runtime/prompt_builder.py) — assemble system prompt from persona + instructions + guardrails. PLAN.md section 6.3
3. Guardrails (app/runtime/guardrails.py) — static + dynamic guardrail injection. PLAN.md section 6.4
4. Output Filter (app/runtime/output_filter.py) — PII detection and sanitization. PLAN.md section 6.5
5. Tool Base Class (app/runtime/tools/base.py) — abstract BaseTool with execute() and to_claude_tool()
6. Tool implementations: salesforce_query.py, sf_record_update.py, slack_notify.py, email_send.py, google_sheets_read.py — each in app/runtime/tools/
7. Tool Loader (app/runtime/tool_loader.py) — load allowed tools from registry
8. Agent Executor (app/runtime/executor.py) — Anthropic Python SDK tool-calling loop with timeout, rate limiting, token tracking. PLAN.md section 6.1. Use anthropic library directly (messages.create with tools), NOT Claude Agent SDK.
9. Execution service (app/services/execution_service.py) — run_agent, get_execution, list_executions, cancel
10. Execution router (app/routers/executions.py) — wire up all execution endpoints
11. Validation service (app/services/validation_service.py) — validate Agent MD against schema

Make sure the anthropic package is in requirements.txt.

After implementing, verify: cd agent-platform-api && python -m uvicorn app.main:app --port 8000
Fix any import errors before finishing.

When completely finished and verified working, run this exact command:
```
openclaw system event --text "B4 Complete: Agent runtime, MD parser, guardrails, output filter, tool implementations, executor with Anthropic API, execution endpoints all built." --mode now
```
