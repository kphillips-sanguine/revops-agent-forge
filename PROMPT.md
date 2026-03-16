You are building a comprehensive implementation plan for a custom AI Agent Platform for Sanguine Bio (a biotech company). Write the plan to PLAN.md in the current directory.

## PROJECT CONTEXT

Kevin (Architect @ Sanguine Bio) wants to build an internal "Agent IDE" — a Replit-like experience for creating governed AI agents. Business users describe what they want in natural language, and the platform generates structured Agent MD definition files that are executed by a managed runtime.

## MAJOR COMPONENTS

### 1. React Frontend — "Agent Builder UI"
- Chat-like prompt interface where business users describe what agent they want in natural language
- A meta-agent (Claude API) behind the prompt takes user input and generates structured Agent MD definition files
- Preview/editor panel (Monaco Editor) showing the generated agent definition — users can see AND edit the MD
- Conversational refinement: user says "Make it also check Salesforce cases" and the definition regenerates
- Real-time validation: show errors/warnings as the agent def is built
- Simulation/dry-run mode: test agents against sample data before going live
- Agent management dashboard: list all agents, status (draft/pending_review/approved/active/disabled), execution history, costs
- Tool browser: shows available preset tools business users can reference in their agents
- NOT a full IDE — it is a configurator with AI assistance

### 2. Agent Runtime — Python Execution Engine
- Parses Agent MD definitions and executes them
- Builds system prompts from the spec, configures tools from an allowed list, injects guardrails automatically
- Framework: LangGraph or Claude Agent SDK for the tool-calling loop
- Single executor pattern: one runtime interprets any agent definition (not custom code per agent)
- Tool allowlisting enforced programmatically (agent can only call tools in its tools_allowed list)
- Rate limiting, timeout enforcement, output filtering (PII detection), sandboxing
- All tool calls logged with inputs and outputs

### 3. n8n Orchestration Layer
- Existing n8n instance at https://n8n-z5fpv.sevalla.app
- Single "Agent Executor" n8n workflow: trigger (cron/webhook/manual) with agent_id -> fetch def from DB -> validate active status -> call Python runtime -> capture output -> log execution -> handle errors/notifications
- Human-in-the-loop approval gates for sensitive operations

### 4. Preset Tools (Managed by RevOps developers, NOT business users)
- Business users reference tools by name in their agent definitions; they never touch credentials or implementations
- Tool registry in DB: name, description, type, implementation, permissions, rate_limits, requires_approval
- Tiered access: Read-only (auto-approved) -> Notify (rate-limited) -> Write (requires approval) -> Sensitive (per-execution approval)
- Initial tools: salesforce_query, slack_notify, google_sheets_read, email_send, sf_record_update

### 5. Automatic Guardrails
- Static guardrails: auto-injected into every agent (PII protection, cost controls, timeout limits, audit logging)
- Dynamic guardrails: context-aware based on what the agent does (financial data -> SOX rules, external comms -> brand guidelines)
- Runtime enforcement: programmatic tool allowlisting, rate limiting, output filtering, timeout, sandboxing

### Database Schema Concept
- agent_definitions: id, name, version, status (draft|pending_review|approved|active|disabled), definition_md, guardrails_md, tools_allowed (JSON), schedule (JSON), created_by, approved_by, timestamps
- agent_executions: id, agent_id, agent_version, trigger type, status, input/output JSON, llm_calls count, tokens_used, timestamps, error_log
- tool_registry: id, name, description, type, implementation JSON, permissions, rate_limits, requires_approval, enabled, managed_by

### Tech Stack
- Frontend: React + TypeScript + Monaco Editor
- Builder AI: Claude API (generates agent MD from natural language)
- Backend API: Python FastAPI
- Agent Runtime: Python (LangGraph or Claude Agent SDK)
- Orchestration: n8n
- Database: PostgreSQL
- Hosting: Sevalla VPS (Docker, auto-deploy from GitHub)
- Version Control: Git (GitHub org: sanguinebio)

### Existing Infrastructure
- Sevalla VPS hosting (Docker-based, auto-deploy from GitHub on push)
- n8n running at https://n8n-z5fpv.sevalla.app
- Salesforce orgs: prod, dev, qa, b2cdev
- Proxy service on Sevalla for SF CLI + git operations

## DELIVERABLE

Create PLAN.md with these sections:

1. **Project Overview** — Executive summary of what we are building and why
2. **Architecture Diagram** (ASCII art) — How all components connect, data flow
3. **Agent MD Schema Specification** — The exact structure of agent definition files with full examples (at least 2 different agent examples)
4. **Frontend Implementation Plan** — React app structure, component tree, pages, key libraries, state management, API integration, build phases
5. **Backend API Implementation Plan** — All FastAPI endpoints with signatures, authentication, SQLAlchemy models, service layer design, key business logic
6. **Agent Runtime Implementation Plan** — How the Python executor works step-by-step, tool integration pattern, guardrail injection, execution lifecycle, error handling
7. **n8n Integration Plan** — Workflow design, trigger patterns, error handling, how n8n calls the Python runtime
8. **Security and Governance Plan** — Full change control workflow (draft -> review -> approve -> activate), approval gates, audit trail, credential management, RBAC
9. **Database Design** — Complete schema with all tables, relationships, indexes, constraints, migration strategy (Alembic)
10. **Deployment Plan** — Docker setup (Dockerfile + docker-compose), Sevalla hosting config, CI/CD pipeline (GitHub Actions), environment strategy (dev/staging/prod)
11. **Phased Delivery Roadmap** — 4-6 phases with milestones, estimated effort (in weeks), specific deliverables per phase, dependencies
12. **Risk Register** — Key risks with likelihood, impact, and mitigation strategies

Make the plan DETAILED and ACTIONABLE. Include code examples throughout:
- Sample Agent MD definitions (at least 2 complete examples)
- Sample FastAPI endpoint signatures with request/response models
- Sample SQLAlchemy model definitions
- Sample tool registry entries
- Sample guardrail injection code
- Sample Docker configuration
- Sample GitHub Actions workflow

This plan should be thorough enough that a development team can execute from it. Target 2000+ lines of detailed content. Be specific about technology choices and justify them.

IMPORTANT: Do NOT ask clarifying questions. Make decisions and justify them in the plan. For the runtime framework, recommend Claude Agent SDK as the primary choice (simpler, native Claude integration, governed runtime) with a section explaining why it was chosen over LangGraph and raw API loops. Just write the plan — do not ask for input.

When completely finished, run this command to notify me:
openclaw system event --text "Done: Agent Platform PLAN.md complete at C:/code/agent-platform/PLAN.md" --mode now
