# AgentForge Backend — Build Phases for Claude Code

> Each phase is a standalone Claude Code task. Run them in order.
> All backend work happens in `C:\code\agent-platform\agent-platform-api\`

---

## Phase B1: Project Scaffold + Database + Models

**Dependencies:** None (greenfield)

### Requirements

1. **Project setup:**
   - Python 3.12+ FastAPI project
   - Dependencies: fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, pydantic, pydantic-settings, python-jose[cryptography], passlib[bcrypt], httpx, python-multipart
   - Project structure matching PLAN.md section 5.1

2. **Configuration (`app/config.py`):**
   - Pydantic BaseSettings loading from env vars
   - DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET, SLACK_BOT_TOKEN, N8N_BASE_URL, N8N_API_KEY, ENVIRONMENT

3. **Database setup (`app/database.py`):**
   - SQLAlchemy 2.0 async engine + async session factory
   - Base declarative model

4. **SQLAlchemy models (all from PLAN.md section 5.4 + 9.1):**
   - `models/user.py` — User (id, email, display_name, role, is_active, timestamps)
   - `models/agent.py` — AgentDefinition + AgentVersion
   - `models/execution.py` — AgentExecution + ToolCallLog
   - `models/tool.py` — ToolRegistryEntry
   - `models/audit.py` — AuditLog
   - `models/api_key.py` — ApiKey

5. **Alembic setup:**
   - Initialize alembic with async support
   - Initial migration creating all tables

6. **Pydantic schemas (`app/schemas/`):**
   - All request/response schemas from PLAN.md section 5.3
   - agent.py, execution.py, tool.py, builder.py, auth.py

7. **Dependencies (`app/dependencies.py`):**
   - `get_db` — async session dependency
   - `get_current_user` — JWT token validation (mock for now, return hardcoded user)
   - `require_role(role)` — role-based access dependency
   - `verify_api_key` — API key verification for service calls

8. **FastAPI app factory (`app/main.py`):**
   - Create app with CORS middleware
   - Mount routers
   - Health check endpoint: GET /api/health

9. **Seed script (`scripts/seed.py`):**
   - Create default admin user (kevin@sanguinebio.com, role=revops)
   - Create 5 tool registry entries (salesforce_query, sf_record_update, slack_notify, email_send, google_sheets_read) matching PLAN.md section 5.5
   - Create a default API key for n8n

10. **Dockerfile:**
    - Python 3.12-slim base
    - Install dependencies
    - Run alembic upgrade head on startup
    - Uvicorn with 2 workers

11. **requirements.txt** with pinned versions

### Acceptance Criteria
- `pip install -r requirements.txt` works
- Alembic migration runs and creates all tables
- `uvicorn app.main:app` starts without errors
- GET /api/health returns 200
- GET /docs shows Swagger UI with all schemas

---

## Phase B2: Agent CRUD + Tool Registry Endpoints

**Dependencies:** B1 complete

### Requirements

1. **Agent service (`app/services/agent_service.py`):**
   - create_agent(name, definition_md, tools_allowed, schedule, user) → creates in draft status, version 1
   - get_agent(id, version=None) → returns latest or specific version
   - list_agents(filters) → paginated list with optional status/tag/author filters
   - update_agent(id, definition_md, tools_allowed, schedule, user) → increments version, saves to agent_versions
   - delete_agent(id) → soft delete (is_deleted=True)
   - Lifecycle transitions: submit_for_review, approve, reject, activate, disable
   - Each transition validates the current status and records in audit_log
   - list_versions(agent_id) → version history

2. **Agent router (`app/routers/agents.py`):**
   - All endpoints from PLAN.md section 5.2 (Agents section)
   - POST / — create
   - GET / — list with filters
   - GET /{id} — get single
   - PUT /{id} — update
   - DELETE /{id} — soft delete
   - PATCH /{id}/submit — submit for review
   - PATCH /{id}/approve — approve
   - PATCH /{id}/reject — reject with reason
   - PATCH /{id}/activate — activate
   - PATCH /{id}/disable — disable
   - GET /{id}/versions — version history

3. **Tool service (`app/services/tool_service.py`):**
   - list_tools(tier, enabled) → filtered list
   - get_tool(id) → single tool with full details
   - create_tool(data, user) → revops only
   - update_tool(id, data, user) → revops only

4. **Tool router (`app/routers/tools.py`):**
   - GET / — list tools
   - GET /{id} — get tool details
   - POST / — create (revops only)
   - PUT /{id} — update (revops only)

5. **Audit service (`app/services/audit_service.py`):**
   - log_action(entity_type, entity_id, action, actor, details) → creates audit record

### Acceptance Criteria
- All agent CRUD endpoints work via Swagger UI
- Lifecycle transitions enforce valid state changes (e.g., can't approve a draft)
- Invalid transitions return 400 with clear error message
- Version history tracks all changes
- Tool CRUD works, create/update restricted to revops role
- Audit log records all state transitions

---

## Phase B3: Auth + Frontend API Wiring

**Dependencies:** B2 complete

### Requirements

1. **Auth service (`app/services/auth_service.py`):**
   - login(email, password) → returns JWT token
   - For dev: accept any password for seeded users
   - JWT contains: user_id, email, role, exp

2. **Auth router (`app/routers/auth.py`):**
   - POST /api/auth/login — returns {access_token, token_type, user}
   - GET /api/auth/me — returns current user from token

3. **Update dependencies.py:**
   - `get_current_user` actually validates JWT and looks up user
   - `require_role` checks user.role against required role

4. **CORS configuration:**
   - Allow http://localhost:5173 (frontend dev server)
   - Allow credentials

5. **Update frontend API client (`agent-platform-ui/src/api/`):**
   - Update `client.ts` to use real base URL and attach JWT from localStorage
   - Create `agents.ts` — API functions matching backend endpoints
   - Create `executions.ts` — API functions for execution endpoints
   - Create `tools.ts` — API functions for tool endpoints
   - Create `auth.ts` — login/me functions

6. **Update frontend stores to use real API:**
   - `authStore.ts` — real login/logout with JWT storage
   - `agentStore.ts` — fetch from API, fallback to mock data if API unavailable
   - `executionStore.ts` — fetch from API

7. **Add login page to frontend:**
   - Simple login form (email + password)
   - Redirect to dashboard after login
   - Protected routes (redirect to login if not authenticated)

### Acceptance Criteria
- Login works and returns JWT
- Frontend can authenticate and make API calls
- Agent list loads from database (after seeding)
- Creating an agent via Builder saves to database
- Falls back to mock data gracefully if backend is down

---

## Phase B4: Agent Runtime + Execution

**Dependencies:** B3 complete

### Requirements

1. **MD Parser (`app/runtime/md_parser.py`):**
   - Full implementation from PLAN.md section 6.2
   - parse_agent_md(md_string) → structured dict
   - Parse all sections: name, metadata, description, persona, instructions (steps + decision logic), tools, schedule, inputs, outputs, constraints, tags

2. **Prompt Builder (`app/runtime/prompt_builder.py`):**
   - build_system_prompt(persona, instructions, guardrails, input_context) → string
   - Implementation from PLAN.md section 6.3

3. **Guardrails (`app/runtime/guardrails.py`):**
   - inject_guardrails(agent_config, static_guardrails, dynamic_context) → string
   - Static guardrails always injected
   - Dynamic guardrails based on tool tiers (write tools, sensitive tools, salesforce, communication)
   - Implementation from PLAN.md section 6.4

4. **Output Filter (`app/runtime/output_filter.py`):**
   - filter_output(output) → sanitized output
   - PII detection patterns (SSN, credit cards, credentials)
   - Implementation from PLAN.md section 6.5

5. **Tool Base Class (`app/runtime/tools/base.py`):**
   - Abstract BaseTool with: name, description, input_schema, execute(params) → result
   - to_claude_tool() → returns tool definition for Claude API

6. **Tool Implementations:**
   - `salesforce_query.py` — executes SOQL via SF CLI subprocess
   - `sf_record_update.py` — updates records via SF CLI
   - `slack_notify.py` — sends Slack messages via API
   - `email_send.py` — placeholder (logs the email)
   - `google_sheets_read.py` — placeholder (returns mock data)
   - Each tool enforces rate limits and logs calls

7. **Tool Loader (`app/runtime/tool_loader.py`):**
   - load_tools(allowed_tools, tool_registry, execution_id, rate_limits) → list of tool instances
   - Only loads tools that are in the agent's allowed list AND enabled in registry

8. **Agent Executor (`app/runtime/executor.py`):**
   - Full implementation from PLAN.md section 6.1
   - Uses Anthropic Python SDK (not Claude Agent SDK — use raw messages.create with tool_use)
   - Tool-calling loop with max iterations, timeout, token tracking
   - Logs all tool calls to ToolCallLog table

9. **Execution service (`app/services/execution_service.py`):**
   - run_agent(agent_id, trigger_type, input_context, user) → creates execution record, runs executor, updates record
   - get_execution(id) → execution with tool call logs
   - list_executions(filters) → paginated list
   - cancel_execution(id) → sets status to cancelled

10. **Execution router (`app/routers/executions.py`):**
    - POST /api/exec/run — run an agent
    - GET /api/exec/{id} — get execution detail
    - GET /api/exec/ — list executions
    - GET /api/exec/{id}/logs — get tool call logs
    - POST /api/exec/{id}/cancel — cancel execution

11. **Validation service (`app/services/validation_service.py`):**
    - validate_agent_md(definition_md) → list of validation results
    - Checks required sections, tool references, schedule format, constraints

### Acceptance Criteria
- MD parser correctly parses both example agents from PLAN.md
- Executor can run an agent end-to-end (with at least one working tool)
- Execution records are created with tool call logs
- POST /api/exec/run triggers execution and returns results
- Rate limiting and timeout enforcement work
- Guardrails are injected into system prompt
- Output filter catches PII patterns

---

## Phase B5: Builder AI Service

**Dependencies:** B4 complete

### Requirements

1. **Builder service (`app/services/builder_service.py`):**
   - generate_agent(prompt, conversation_history, current_definition, available_tools) → BuilderResponse
   - Calls Claude API (claude-sonnet-4-20250514) with:
     - System prompt containing the Agent MD schema specification (from PLAN.md section 3.1)
     - Available tools from tool_registry
     - User's prompt + conversation history
   - Returns: definition_md, explanation, tools_used, warnings, suggestions
   - For refinement: includes current_definition in context so Claude can modify it

2. **Validation integration:**
   - After generation, auto-validate the produced MD
   - Include validation warnings in the response

3. **Simulation service (`app/services/simulation_service.py`):**
   - simulate_agent(agent_definition_md, mock_inputs) → SimulationResult
   - Runs the executor but with mock tool responses
   - Mock tools return realistic sample data
   - Returns execution timeline for UI display

4. **Builder router (`app/routers/builder.py`):**
   - POST /api/builder/generate — generate/refine agent definition
   - POST /api/builder/validate — validate MD against schema
   - POST /api/builder/simulate — dry-run with mock data

5. **Update frontend:**
   - Wire BuilderPage to use real /api/builder/generate instead of mock builder
   - Wire simulation panel to use real /api/builder/simulate
   - Keep mock fallback if API is unavailable

### Acceptance Criteria
- POST /api/builder/generate produces valid Agent MD from natural language
- Refinement works (send follow-up prompt, get updated MD)
- Validation endpoint returns meaningful results
- Simulation runs agent with mock tools and returns timeline
- Frontend builder uses real API when backend is available

---

## Phase B6: Governance, Docker, Polish

**Dependencies:** B5 complete

### Requirements

1. **RBAC enforcement:**
   - All endpoints check user role via require_role dependency
   - user: create + edit own agents only
   - reviewer: approve/reject
   - admin: activate/disable
   - revops: everything including tool management

2. **Audit log viewer:**
   - GET /api/audit/ — list audit entries with filters (entity_type, entity_id, actor, date range)
   - GET /api/audit/{entity_type}/{entity_id} — audit trail for specific entity

3. **Dashboard stats endpoint:**
   - GET /api/stats/overview — returns active agent count, pending review count, execution count this week, estimated cost

4. **Production Dockerfile:**
   - Multi-stage: frontend build + backend
   - Serves frontend static files from FastAPI
   - Startup script runs alembic then uvicorn

5. **docker-compose.yml update:**
   - Ensure db, api services work together
   - Add volume for postgres data
   - Health checks

6. **Final frontend polish:**
   - Ensure all pages handle API errors gracefully
   - Loading states when fetching from API
   - 404 page for invalid routes

### Acceptance Criteria
- docker-compose up starts the full stack (db + api + frontend)
- Login → Dashboard → Builder → Create Agent → View Agent → Run Agent flow works end-to-end
- RBAC prevents unauthorized actions
- Audit log captures all significant actions
- App handles errors gracefully (API down, invalid data, etc.)
