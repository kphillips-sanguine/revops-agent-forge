# Sanguine Bio — AI Agent Platform Implementation Plan

> **Project:** Internal AI Agent IDE for governed agent creation and execution
> **Author:** Kevin Phillips (Architect) + Ozzy (AI Partner)
> **Date:** 2026-03-16
> **Status:** Draft v1.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Agent MD Schema Specification](#3-agent-md-schema-specification)
4. [Frontend Implementation Plan](#4-frontend-implementation-plan)
5. [Backend API Implementation Plan](#5-backend-api-implementation-plan)
6. [Agent Runtime Implementation Plan](#6-agent-runtime-implementation-plan)
7. [n8n Integration Plan](#7-n8n-integration-plan)
8. [Security & Governance Plan](#8-security--governance-plan)
9. [Database Design](#9-database-design)
10. [Deployment Plan](#10-deployment-plan)
11. [Phased Delivery Roadmap](#11-phased-delivery-roadmap)
12. [Risk Register](#12-risk-register)

---

## 1. Project Overview

### 1.1 Executive Summary

Sanguine Bio needs a governed platform that empowers business users to create, test, and deploy AI agents while maintaining enterprise change control and security standards. The platform — internally called **"AgentForge"** — provides a Replit-like natural language interface where users describe what they want an agent to do, and the system generates a structured agent definition that is executed by a managed runtime.

### 1.2 Problem Statement

- Business teams want AI automation (case triage, data lookups, report generation, notifications)
- IT/RevOps needs change control, security, and auditability over what agents do
- Current options (raw code, third-party platforms) don't satisfy both needs simultaneously
- No standardized way to define, review, approve, and execute AI agents across the organization

### 1.3 Solution

A three-tier platform:

| Tier | Component | Audience |
|------|-----------|----------|
| **Create** | React UI + Claude-powered builder | Business users |
| **Govern** | Approval workflows, guardrails, audit logging | RevOps / IT |
| **Execute** | Python runtime + n8n orchestration | Automated (managed by RevOps) |

### 1.4 Key Principles

1. **Agents are config, not code** — Declarative MD specs, not arbitrary Python
2. **Preset tools only** — Business users pick from approved tools; they never write integrations
3. **Guardrails are automatic** — Security policies injected at runtime, not user-managed
4. **Change control mirrors Salesforce** — Draft → Review → Approve → Activate (sandbox → production mindset)
5. **Single executor** — One runtime interprets all agents; no per-agent custom code

### 1.5 Technology Choices

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Frontend | React + TypeScript + Vite | Industry standard, team familiarity, fast dev cycle |
| Editor | Monaco Editor | Same engine as VS Code, excellent MD editing, syntax highlighting |
| State Mgmt | Zustand | Lightweight, no boilerplate, works well with async |
| Builder AI | Claude API (claude-sonnet-4-20250514) | Best structured output, fast, cost-effective for generation |
| Backend API | Python FastAPI | Async-native, auto OpenAPI docs, Pydantic validation |
| Agent Runtime | Claude Agent SDK (Python) | Native Claude integration, simple tool-calling loop, governed execution. Chosen over LangGraph (too complex for config-driven agents) and raw API (too much boilerplate) |
| Orchestration | n8n (self-hosted) | Already deployed, visual workflow editor, cron/webhook triggers built-in |
| Database | PostgreSQL 16 | JSONB for flexible schemas, mature, excellent with SQLAlchemy |
| ORM | SQLAlchemy 2.0 + Alembic | Async support, type-safe, migration management |
| Hosting | Sevalla VPS (Docker) | Existing infra, auto-deploy from GitHub |
| CI/CD | GitHub Actions | Existing org (sanguinebio), familiar pattern |

---

## 2. Architecture

### 2.1 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USERS (Business / RevOps)                     │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TypeScript)                     │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Agent       │  │ Agent Editor │  │ Dashboard  │  │ Tool       │  │
│  │ Builder     │  │ (Monaco)     │  │ & History  │  │ Browser    │  │
│  │ Chat UI     │  │              │  │            │  │            │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘  │
│         │                │                 │                │         │
└─────────┼────────────────┼─────────────────┼────────────────┼────────┘
          │                │                 │                │
          ▼                ▼                 ▼                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (FastAPI)                             │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ /agents     │  │ /builder     │  │ /exec      │  │ /tools     │  │
│  │ CRUD +      │  │ Claude API   │  │ Run/status │  │ Registry   │  │
│  │ Lifecycle   │  │ generation   │  │ History    │  │ Mgmt       │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘  │
│         │                │                 │                │         │
│  ┌──────┴────────────────┴─────────────────┴────────────────┴──────┐  │
│  │                    Service Layer                                 │  │
│  │  AgentService | BuilderService | ExecutionService | ToolService  │  │
│  └──────────────────────┬──────────────────────────────────────────┘  │
│                          │                                            │
│  ┌───────────────────────┴────────────────────────────────────────┐   │
│  │                    PostgreSQL (SQLAlchemy 2.0)                  │   │
│  │  agent_definitions | agent_executions | tool_registry | users   │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│   AGENT RUNTIME (Python)     │  │   n8n ORCHESTRATION              │
│                               │  │                                  │
│  ┌─────────────────────────┐ │  │  ┌────────────────────────────┐  │
│  │ MD Parser               │ │  │  │ Agent Executor Workflow    │  │
│  │ → System Prompt Builder │ │  │  │                            │  │
│  │ → Tool Configurator     │ │  │  │ Trigger (cron/webhook)     │  │
│  │ → Guardrail Injector    │ │  │  │   → Fetch agent from API   │  │
│  │ → Claude Agent SDK Loop │ │  │  │   → Call runtime /execute  │  │
│  │ → Output Filter         │ │  │  │   → Log results            │  │
│  │ → Execution Logger      │ │  │  │   → Error notifications    │  │
│  └─────────────────────────┘ │  │  └────────────────────────────┘  │
│                               │  │                                  │
│  Preset Tools:                │  │  ┌────────────────────────────┐  │
│  ┌───────────┐ ┌───────────┐ │  │  │ Approval Workflow          │  │
│  │ SF Query  │ │ Slack     │ │  │  │ (human-in-the-loop)        │  │
│  │ SF Update │ │ Email     │ │  │  └────────────────────────────┘  │
│  │ Sheets    │ │ HTTP      │ │  │                                  │
│  └───────────┘ └───────────┘ │  │  ┌────────────────────────────┐  │
└──────────────────────────────┘  │  │ Schedule Manager            │  │
                                   │  │ (cron triggers per agent)   │  │
                                   │  └────────────────────────────┘  │
                                   └──────────────────────────────────┘
```

### 2.2 Data Flow: Agent Creation

```
User types: "I need an agent that checks for overdue invoices daily
             and sends a Slack reminder to the finance channel"
    │
    ▼
Frontend sends to POST /api/builder/generate
    │
    ▼
Backend calls Claude API with:
  - User's description
  - Agent MD schema (as system prompt)
  - Available tools from tool_registry
  - Organization guardrail templates
    │
    ▼
Claude generates structured Agent MD definition
    │
    ▼
Backend validates MD against schema
    │
    ▼
Frontend displays in Monaco Editor (user can refine)
    │
    ▼
User clicks "Save Draft" → POST /api/agents (status: draft)
    │
    ▼
User clicks "Submit for Review" → PATCH /api/agents/{id}/submit
    │
    ▼
Reviewer approves → PATCH /api/agents/{id}/approve
    │
    ▼
Admin activates → PATCH /api/agents/{id}/activate
    │
    ▼
n8n picks up schedule → Executes via runtime
```

### 2.3 Data Flow: Agent Execution

```
Trigger fires (cron / webhook / manual)
    │
    ▼
n8n "Agent Executor" workflow starts
    │
    ▼
n8n calls GET /api/agents/{id} → fetch definition
    │
    ▼
n8n validates agent status == "active"
    │
    ▼
n8n calls POST /api/exec/run {agent_id, trigger_type, input_context}
    │
    ▼
Runtime:
  1. Parse Agent MD definition
  2. Build system prompt (persona + instructions + guardrails)
  3. Load allowed tools from tool_registry
  4. Initialize Claude Agent SDK with tools + prompt
  5. Execute agent loop (LLM calls + tool calls)
  6. Filter output (PII detection, format validation)
  7. Log all tool calls + LLM interactions
  8. Return result
    │
    ▼
n8n receives result
    │
    ▼
n8n logs execution to POST /api/exec/log
    │
    ▼
n8n handles output (notify, store, trigger next workflow)
```

---

## 3. Agent MD Schema Specification

### 3.1 Schema Definition

Every agent is defined by a single Markdown document with required and optional sections. The runtime parses this document to configure agent behavior.

```markdown
# Agent: {agent_name}

## Metadata
- **ID:** {auto-generated UUID}
- **Version:** {integer, auto-incremented}
- **Author:** {created_by user}
- **Created:** {ISO 8601 timestamp}
- **Status:** {draft | pending_review | approved | active | disabled}

## Description
{Free-text description of what this agent does and why it exists.
This is shown in the dashboard and used by the builder AI for context.}

## Persona
{The agent's personality and communication style.
Defines how it interacts with users and formats its outputs.}

## Instructions
{Step-by-step instructions for what the agent should do.
Written in natural language. The runtime converts these
into the system prompt for the LLM.}

### Steps
1. {First step}
2. {Second step}
3. {Third step}
...

### Decision Logic
- **If** {condition}: {action}
- **If** {condition}: {action}
- **Default:** {fallback action}

## Tools
{List of preset tools this agent is allowed to use.
Must reference tools from the tool_registry by exact name.}

- **{tool_name}**: {how/why this agent uses it}
- **{tool_name}**: {how/why this agent uses it}

## Schedule
- **Type:** {cron | webhook | manual | event}
- **Expression:** {cron expression, if type=cron}
- **Webhook Path:** {path, if type=webhook}
- **Event Source:** {source, if type=event}

## Inputs
{What data this agent needs to start. Defines the input_context schema.}

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| {name} | {type} | {yes/no} | {description} |

## Outputs
{What this agent produces. Defines the output schema.}

| Field | Type | Description |
|-------|------|-------------|
| {name} | {type} | {description} |

## Constraints
{Agent-specific constraints beyond the automatic guardrails.}

- Max LLM calls: {number, default 50}
- Max execution time: {seconds, default 300}
- Max tokens per call: {number, default 4096}
- Retry on failure: {yes/no, default no}
- Max retries: {number, default 3}

## Tags
{Comma-separated tags for categorization and search.}
{e.g., finance, salesforce, daily, notifications}
```

### 3.2 Example Agent: Overdue Invoice Reminder

```markdown
# Agent: Overdue Invoice Reminder

## Metadata
- **ID:** 550e8400-e29b-41d4-a716-446655440001
- **Version:** 1
- **Author:** jane.doe@sanguinebio.com
- **Created:** 2026-03-16T14:00:00Z
- **Status:** active

## Description
Checks Salesforce daily for invoices past their due date and sends a summary
to the #finance Slack channel. Helps the finance team stay on top of collections
without manually running reports.

## Persona
Professional and concise. Use bullet points for clarity. Include invoice
numbers and amounts for easy reference. Flag anything over 90 days as urgent.

## Instructions
Query Salesforce for all open invoices where the due date has passed.
Group them by age buckets and format a clear summary for the finance team.

### Steps
1. Query Salesforce for all Invoice__c records where Status__c = 'Open'
   and Due_Date__c < TODAY
2. Group results into buckets: 1-30 days, 31-60 days, 61-90 days, 90+ days
3. Calculate total outstanding amount per bucket
4. Format a Slack message with the summary
5. If any invoices are 90+ days overdue, prefix the message with ":rotating_light: URGENT"
6. Send the summary to the #finance Slack channel

### Decision Logic
- **If** no overdue invoices found: Send "All clear — no overdue invoices today! :white_check_mark:"
- **If** total overdue > $100,000: Also send a DM to the CFO
- **Default:** Send standard summary to #finance

## Tools
- **salesforce_query**: Query Invoice__c records with SOQL
- **slack_notify**: Send formatted messages to Slack channels

## Schedule
- **Type:** cron
- **Expression:** 0 8 * * 1-5
- **Timezone:** America/Denver

## Inputs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none — this agent is self-contained) | | | |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| summary | string | Formatted overdue invoice summary |
| total_overdue | number | Total dollar amount overdue |
| invoice_count | integer | Number of overdue invoices |
| urgent | boolean | True if any invoice is 90+ days overdue |

## Constraints
- Max LLM calls: 10
- Max execution time: 120
- Max tokens per call: 2048
- Retry on failure: yes
- Max retries: 2

## Tags
finance, salesforce, daily, notifications, invoices
```

### 3.3 Example Agent: New Case Triage Bot

```markdown
# Agent: Case Triage Bot

## Metadata
- **ID:** 550e8400-e29b-41d4-a716-446655440002
- **Version:** 3
- **Author:** kevin.phillips@sanguinebio.com
- **Created:** 2026-03-10T09:00:00Z
- **Status:** active

## Description
Automatically triages new Salesforce Cases by analyzing the subject and
description, assigning priority, suggesting a category, and routing to
the appropriate queue. Runs on every new case creation via webhook.

## Persona
Analytical and precise. When providing triage reasoning, be specific about
which keywords or patterns led to the classification. Never guess — if
uncertain about priority, default to Medium and flag for human review.

## Instructions
Receive a new Case payload, analyze its content, classify it, and update
the Case record in Salesforce with triage results.

### Steps
1. Receive the new Case data (Id, Subject, Description, Contact info)
2. Analyze the Subject and Description for urgency indicators:
   - Keywords: "down", "outage", "urgent", "ASAP", "broken", "error", "crash"
   - Sentiment: negative/frustrated language
   - Business impact: mentions of revenue, customers, deadlines
3. Classify Priority: Critical / High / Medium / Low
4. Classify Category: Bug, Feature Request, Question, Access Request, Data Issue
5. Determine routing queue based on category:
   - Bug → Engineering Support
   - Feature Request → Product Team
   - Question → Tier 1 Support
   - Access Request → IT Admin
   - Data Issue → Data Operations
6. Update the Case in Salesforce with:
   - Priority (if not already set by submitter)
   - Case_Category__c
   - Triage_Notes__c (reasoning for classification)
   - OwnerId (route to queue)
7. If Priority = Critical, also send a Slack alert to #critical-cases

### Decision Logic
- **If** Subject contains "outage" or "down" AND Description mentions production: Priority = Critical
- **If** Contact is a VIP account (check Account.VIP__c): Bump priority by one level
- **If** Description is empty or too vague to classify: Set Priority = Medium, add Triage_Notes = "Needs manual review — insufficient detail"
- **Default:** Use LLM analysis for classification

## Tools
- **salesforce_query**: Look up Case details, Contact info, Account VIP status
- **sf_record_update**: Update Case fields (Priority, Category, Notes, Owner)
- **slack_notify**: Alert #critical-cases for Critical priority

## Schedule
- **Type:** webhook
- **Webhook Path:** /trigger/case-triage
- **Event Source:** Salesforce Platform Event (New_Case__e)

## Inputs
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| case_id | string | yes | Salesforce Case record ID |
| subject | string | yes | Case subject line |
| description | string | no | Case description body |
| contact_id | string | no | Contact who submitted the case |
| account_id | string | no | Associated Account ID |

## Outputs
| Field | Type | Description |
|-------|------|-------------|
| priority | string | Assigned priority (Critical/High/Medium/Low) |
| category | string | Assigned category |
| queue | string | Routing destination |
| triage_notes | string | Reasoning for the classification |
| needs_review | boolean | True if manual review is recommended |

## Constraints
- Max LLM calls: 5
- Max execution time: 60
- Max tokens per call: 2048
- Retry on failure: yes
- Max retries: 1

## Tags
salesforce, cases, triage, automation, webhook, support
```

### 3.4 Schema Parsing Rules

The runtime uses these rules when parsing Agent MD files:

1. **`# Agent: {name}`** — Required. First H1 heading defines the agent name.
2. **`## Metadata`** — Required. Parsed as key-value pairs from list items.
3. **`## Description`** — Required. Free text until next H2.
4. **`## Persona`** — Optional. If omitted, a default professional persona is used.
5. **`## Instructions`** — Required. The core behavior specification.
6. **`### Steps`** — Required sub-section. Ordered list parsed into execution steps.
7. **`### Decision Logic`** — Optional. Conditional branching rules.
8. **`## Tools`** — Required. Each list item must match a tool_registry entry.
9. **`## Schedule`** — Required. Defines trigger mechanism.
10. **`## Inputs`** / **`## Outputs`** — Required. Table format parsed into JSON schemas.
11. **`## Constraints`** — Optional. Overrides default limits (within max caps).
12. **`## Tags`** — Optional. Comma-separated, used for dashboard filtering.

---

## 4. Frontend Implementation Plan

### 4.1 Project Structure

```
agent-platform-ui/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Router + layout
│   ├── api/
│   │   ├── client.ts              # Axios instance + interceptors
│   │   ├── agents.ts              # Agent CRUD API calls
│   │   ├── builder.ts             # Builder/generation API calls
│   │   ├── executions.ts          # Execution history API calls
│   │   └── tools.ts               # Tool registry API calls
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Main layout (sidebar + content)
│   │   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   │   └── Header.tsx         # Top bar with user info
│   │   ├── builder/
│   │   │   ├── BuilderChat.tsx    # Chat interface for agent creation
│   │   │   ├── ChatMessage.tsx    # Individual chat message
│   │   │   ├── ChatInput.tsx      # Text input with send button
│   │   │   └── SuggestionChips.tsx # Quick-start suggestions
│   │   ├── editor/
│   │   │   ├── AgentEditor.tsx    # Monaco editor wrapper
│   │   │   ├── EditorToolbar.tsx  # Save, validate, format buttons
│   │   │   ├── ValidationPanel.tsx # Real-time validation results
│   │   │   └── SchemaHelper.tsx   # Schema reference sidebar
│   │   ├── dashboard/
│   │   │   ├── AgentList.tsx      # Agent table with filters
│   │   │   ├── AgentCard.tsx      # Individual agent summary card
│   │   │   ├── StatusBadge.tsx    # Draft/Active/Disabled badges
│   │   │   └── CostSummary.tsx   # Token usage + cost display
│   │   ├── execution/
│   │   │   ├── ExecutionHistory.tsx  # Execution log table
│   │   │   ├── ExecutionDetail.tsx   # Single execution detail view
│   │   │   ├── ExecutionTimeline.tsx # Visual step-by-step timeline
│   │   │   └── LiveExecution.tsx     # Real-time execution monitoring
│   │   ├── tools/
│   │   │   ├── ToolBrowser.tsx    # Available tools gallery
│   │   │   ├── ToolCard.tsx       # Individual tool info card
│   │   │   └── ToolDetail.tsx     # Tool documentation modal
│   │   ├── simulation/
│   │   │   ├── SimulationPanel.tsx  # Dry-run configuration
│   │   │   ├── MockDataEditor.tsx   # Sample input data editor
│   │   │   └── SimulationResult.tsx # Dry-run output display
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── Toast.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx      # Agent list + overview
│   │   ├── BuilderPage.tsx        # Agent creation (chat + editor split view)
│   │   ├── AgentDetailPage.tsx    # View/edit single agent
│   │   ├── ExecutionPage.tsx      # Execution history + details
│   │   ├── ToolsPage.tsx          # Tool browser
│   │   └── SettingsPage.tsx       # User preferences, team management
│   ├── stores/
│   │   ├── agentStore.ts          # Agent state (Zustand)
│   │   ├── builderStore.ts        # Builder chat state
│   │   ├── executionStore.ts      # Execution history state
│   │   └── authStore.ts           # Auth state
│   ├── hooks/
│   │   ├── useAgents.ts           # Agent data fetching hooks
│   │   ├── useBuilder.ts          # Builder generation hooks
│   │   ├── useExecution.ts        # Execution monitoring hooks
│   │   └── useWebSocket.ts        # Real-time updates
│   ├── utils/
│   │   ├── mdParser.ts            # Client-side MD validation
│   │   ├── mdSchema.ts            # Agent MD schema definition
│   │   ├── validators.ts          # Input validation helpers
│   │   └── formatters.ts          # Date, cost, token formatters
│   └── types/
│       ├── agent.ts               # Agent TypeScript interfaces
│       ├── execution.ts           # Execution types
│       ├── tool.ts                # Tool types
│       └── api.ts                 # API request/response types
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

### 4.2 Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| react | ^19.x | UI framework |
| react-router-dom | ^7.x | Client-side routing |
| @monaco-editor/react | ^4.x | Code/MD editor component |
| zustand | ^5.x | State management |
| axios | ^1.x | HTTP client |
| tailwindcss | ^4.x | Utility-first CSS |
| @tanstack/react-query | ^5.x | Server state + caching |
| react-hot-toast | ^2.x | Toast notifications |
| lucide-react | ^0.x | Icons |
| date-fns | ^4.x | Date formatting |
| zod | ^3.x | Runtime type validation |

### 4.3 Page Layouts

#### Builder Page (Primary Workflow)

```
┌──────────────────────────────────────────────────────────────┐
│  Header: AgentForge | [Dashboard] [Builder] [Tools] | User  │
├────────────────────────┬─────────────────────────────────────┤
│                        │                                     │
│   CHAT PANEL (40%)     │   EDITOR PANEL (60%)                │
│                        │                                     │
│  ┌──────────────────┐  │  ┌───────────────────────────────┐  │
│  │ "I need an agent │  │  │ # Agent: Invoice Reminder     │  │
│  │  that checks..." │  │  │                               │  │
│  │                  │  │  │ ## Description                │  │
│  │  [AI Response]   │  │  │ Checks for overdue invoices...│  │
│  │  "Here's what    │  │  │                               │  │
│  │   I've created"  │  │  │ ## Instructions               │  │
│  │                  │  │  │ ### Steps                     │  │
│  │  "Make it also   │  │  │ 1. Query Salesforce...        │  │
│  │   check cases"   │  │  │ 2. Group by age...            │  │
│  │                  │  │  │                               │  │
│  │  [AI Response]   │  │  │ ## Tools                      │  │
│  │  "Updated —      │  │  │ - salesforce_query            │  │
│  │   added case     │  │  │ - slack_notify                │  │
│  │   checking"      │  │  │                               │  │
│  └──────────────────┘  │  └───────────────────────────────┘  │
│                        │                                     │
│  ┌──────────────────┐  │  ┌───────────────────────────────┐  │
│  │ Type a message.. │  │  │ [Validate] [Save Draft]       │  │
│  │            [Send]│  │  │ [Submit for Review] [Simulate]│  │
│  └──────────────────┘  │  └───────────────────────────────┘  │
│                        │                                     │
│  AVAILABLE TOOLS       │  VALIDATION                         │
│  ┌──────────────────┐  │  ┌───────────────────────────────┐  │
│  │ ✅ salesforce_q  │  │  │ ✅ Schema valid               │  │
│  │ ✅ slack_notify  │  │  │ ✅ All tools available         │  │
│  │ ✅ email_send    │  │  │ ⚠️  No constraints section    │  │
│  │ ✅ sheets_read   │  │  │ ✅ Schedule is valid cron      │  │
│  │ 🔒 sf_update    │  │  │                               │  │
│  └──────────────────┘  │  └───────────────────────────────┘  │
└────────────────────────┴─────────────────────────────────────┘
```

#### Dashboard Page

```
┌──────────────────────────────────────────────────────────────┐
│  Header: AgentForge | [Dashboard] [Builder] [Tools] | User  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  OVERVIEW CARDS                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │ 12 Active  │ │ 3 Pending  │ │ 847 Runs   │ │ $42.30   │  │
│  │ Agents     │ │ Review     │ │ This Week  │ │ Est Cost │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘  │
│                                                              │
│  AGENTS TABLE                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Name          │ Status  │ Last Run    │ Runs │ Cost     ││
│  │───────────────┼─────────┼─────────────┼──────┼──────────││
│  │ Invoice Alert │ ✅ Active│ 2h ago ✓   │ 120  │ $3.40   ││
│  │ Case Triage   │ ✅ Active│ 5m ago ✓   │ 580  │ $28.10  ││
│  │ Weekly Report │ ⏳ Review│ —          │ 0    │ $0.00   ││
│  │ Data Cleanup  │ 📝 Draft │ —          │ 0    │ $0.00   ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 Frontend Build Phases

| Phase | Deliverable | Effort |
|-------|-------------|--------|
| 4a | Project scaffold, routing, auth, AppShell layout | 1 week |
| 4b | Agent CRUD: Dashboard, AgentList, AgentDetail | 1 week |
| 4c | Builder: Chat UI + Claude integration + Monaco editor | 2 weeks |
| 4d | Execution: History, detail view, live monitoring | 1 week |
| 4e | Tools browser, simulation/dry-run, polish | 1 week |

---

## 5. Backend API Implementation Plan

### 5.1 Project Structure

```
agent-platform-api/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app factory
│   ├── config.py                   # Settings (Pydantic BaseSettings)
│   ├── database.py                 # SQLAlchemy async engine + session
│   ├── dependencies.py             # Dependency injection (auth, db session)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── agents.py              # /api/agents endpoints
│   │   ├── builder.py             # /api/builder endpoints
│   │   ├── executions.py          # /api/exec endpoints
│   │   ├── tools.py               # /api/tools endpoints
│   │   └── auth.py                # /api/auth endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   ├── agent.py               # AgentDefinition SQLAlchemy model
│   │   ├── execution.py           # AgentExecution model
│   │   ├── tool.py                # ToolRegistryEntry model
│   │   └── user.py                # User model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── agent.py               # Pydantic request/response schemas
│   │   ├── execution.py
│   │   ├── tool.py
│   │   └── builder.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── agent_service.py       # Agent CRUD + lifecycle logic
│   │   ├── builder_service.py     # Claude API generation logic
│   │   ├── execution_service.py   # Runtime invocation + logging
│   │   ├── tool_service.py        # Tool registry management
│   │   ├── guardrail_service.py   # Guardrail injection logic
│   │   └── validation_service.py  # MD schema validation
│   ├── runtime/
│   │   ├── __init__.py
│   │   ├── executor.py            # Main agent execution engine
│   │   ├── md_parser.py           # Markdown → structured config parser
│   │   ├── prompt_builder.py      # System prompt assembly
│   │   ├── tool_loader.py         # Load + configure allowed tools
│   │   ├── guardrails.py          # Guardrail injection + enforcement
│   │   ├── output_filter.py       # PII detection, output sanitization
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── base.py            # BaseTool abstract class
│   │       ├── salesforce_query.py
│   │       ├── sf_record_update.py
│   │       ├── slack_notify.py
│   │       ├── email_send.py
│   │       ├── google_sheets_read.py
│   │       └── http_request.py
│   └── middleware/
│       ├── __init__.py
│       ├── logging.py             # Request/response logging
│       └── rate_limit.py          # API rate limiting
├── alembic/
│   ├── alembic.ini
│   ├── env.py
│   └── versions/
├── tests/
│   ├── conftest.py
│   ├── test_agents.py
│   ├── test_builder.py
│   ├── test_runtime.py
│   └── test_tools.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 5.2 API Endpoints

#### Agents (`/api/agents`)

```python
# === Agent CRUD ===

@router.post("/", response_model=AgentResponse, status_code=201)
async def create_agent(
    agent: AgentCreate,                    # {name, definition_md, tools_allowed, schedule}
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> AgentResponse:
    """Create a new agent definition in draft status."""

@router.get("/", response_model=list[AgentSummary])
async def list_agents(
    status: AgentStatus | None = None,     # Filter by status
    tag: str | None = None,                # Filter by tag
    created_by: str | None = None,         # Filter by author
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[AgentSummary]:
    """List agents with optional filters."""

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    version: int | None = None,            # Specific version (default: latest)
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> AgentResponse:
    """Get full agent definition including MD content."""

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent: AgentUpdate,                    # {definition_md, tools_allowed, schedule}
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> AgentResponse:
    """Update agent definition. Creates new version. Only allowed in draft/approved status."""

@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> None:
    """Soft-delete an agent. Only allowed if not active."""

# === Lifecycle Transitions ===

@router.patch("/{agent_id}/submit", response_model=AgentResponse)
async def submit_for_review(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> AgentResponse:
    """Transition: draft → pending_review. Validates MD schema before allowing."""

@router.patch("/{agent_id}/approve", response_model=AgentResponse)
async def approve_agent(
    agent_id: UUID,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)  # Must have reviewer role
) -> AgentResponse:
    """Transition: pending_review → approved. Requires reviewer role."""

@router.patch("/{agent_id}/reject", response_model=AgentResponse)
async def reject_agent(
    agent_id: UUID,
    reason: str,                           # Required rejection reason
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)  # Must have reviewer role
) -> AgentResponse:
    """Transition: pending_review → draft. Returns to author with feedback."""

@router.patch("/{agent_id}/activate", response_model=AgentResponse)
async def activate_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)  # Must have admin role
) -> AgentResponse:
    """Transition: approved → active. Creates n8n trigger if scheduled."""

@router.patch("/{agent_id}/disable", response_model=AgentResponse)
async def disable_agent(
    agent_id: UUID,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> AgentResponse:
    """Transition: active → disabled. Removes n8n trigger."""

# === Version History ===

@router.get("/{agent_id}/versions", response_model=list[AgentVersionSummary])
async def list_versions(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[AgentVersionSummary]:
    """List all versions of an agent definition."""

@router.get("/{agent_id}/diff", response_model=AgentDiff)
async def diff_versions(
    agent_id: UUID,
    v1: int,                               # Version to compare from
    v2: int,                               # Version to compare to
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> AgentDiff:
    """Diff two versions of an agent definition."""
```

#### Builder (`/api/builder`)

```python
@router.post("/generate", response_model=BuilderResponse)
async def generate_agent(
    request: BuilderRequest,               # {prompt, conversation_history, context}
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> BuilderResponse:
    """Generate or refine an Agent MD definition from natural language.
    Uses Claude API with the agent schema as system prompt.
    Includes available tools from tool_registry in context."""

@router.post("/validate", response_model=ValidationResult)
async def validate_definition(
    request: ValidateRequest,              # {definition_md}
    db: AsyncSession = Depends(get_db)
) -> ValidationResult:
    """Validate an Agent MD definition against the schema.
    Returns errors, warnings, and suggestions."""

@router.post("/simulate", response_model=SimulationResult)
async def simulate_agent(
    request: SimulationRequest,            # {agent_id | definition_md, mock_inputs}
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> SimulationResult:
    """Dry-run an agent with mock tool responses.
    Executes the full runtime but tools return simulated data."""
```

#### Executions (`/api/exec`)

```python
@router.post("/run", response_model=ExecutionResponse)
async def run_agent(
    request: ExecutionRequest,             # {agent_id, trigger_type, input_context}
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_api_key) # n8n uses API key auth
) -> ExecutionResponse:
    """Execute an agent. Called by n8n or manual trigger.
    Returns execution_id for status tracking."""

@router.get("/{execution_id}", response_model=ExecutionDetail)
async def get_execution(
    execution_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> ExecutionDetail:
    """Get detailed execution results including tool call logs."""

@router.get("/", response_model=list[ExecutionSummary])
async def list_executions(
    agent_id: UUID | None = None,
    status: ExecutionStatus | None = None,
    trigger: TriggerType | None = None,
    since: datetime | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[ExecutionSummary]:
    """List executions with filters."""

@router.get("/{execution_id}/logs", response_model=list[ToolCallLog])
async def get_execution_logs(
    execution_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[ToolCallLog]:
    """Get detailed tool call logs for an execution."""

@router.post("/{execution_id}/cancel", response_model=ExecutionResponse)
async def cancel_execution(
    execution_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> ExecutionResponse:
    """Cancel a running execution."""
```

#### Tools (`/api/tools`)

```python
@router.get("/", response_model=list[ToolSummary])
async def list_tools(
    tier: ToolTier | None = None,          # Filter by tier
    enabled: bool = True,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[ToolSummary]:
    """List available tools. Business users see description + tier.
    RevOps sees full implementation details."""

@router.get("/{tool_id}", response_model=ToolDetail)
async def get_tool(
    tool_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
) -> ToolDetail:
    """Get tool details including documentation and usage examples."""

# === RevOps-only endpoints ===

@router.post("/", response_model=ToolDetail, status_code=201)
async def create_tool(
    tool: ToolCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("revops"))
) -> ToolDetail:
    """Register a new tool. RevOps only."""

@router.put("/{tool_id}", response_model=ToolDetail)
async def update_tool(
    tool_id: UUID,
    tool: ToolUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("revops"))
) -> ToolDetail:
    """Update tool configuration. RevOps only."""
```

### 5.3 Pydantic Schemas (Key Examples)

```python
# === schemas/agent.py ===

from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from enum import Enum

class AgentStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    ACTIVE = "active"
    DISABLED = "disabled"

class AgentCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    definition_md: str = Field(..., min_length=50)
    tools_allowed: list[str] = Field(default_factory=list)
    schedule: dict | None = None

class AgentUpdate(BaseModel):
    definition_md: str | None = None
    tools_allowed: list[str] | None = None
    schedule: dict | None = None

class AgentResponse(BaseModel):
    id: UUID
    name: str
    version: int
    status: AgentStatus
    definition_md: str
    guardrails_md: str | None
    tools_allowed: list[str]
    schedule: dict | None
    created_by: str
    approved_by: str | None
    created_at: datetime
    updated_at: datetime
    last_execution_at: datetime | None
    execution_count: int
    estimated_cost: float

class AgentSummary(BaseModel):
    id: UUID
    name: str
    version: int
    status: AgentStatus
    created_by: str
    tags: list[str]
    last_execution_at: datetime | None
    execution_count: int
    success_rate: float
    estimated_cost: float


# === schemas/builder.py ===

class BuilderRequest(BaseModel):
    prompt: str = Field(..., min_length=10)
    conversation_history: list[dict] = Field(default_factory=list)
    current_definition: str | None = None  # For refinement
    context: dict | None = None            # Additional context

class BuilderResponse(BaseModel):
    definition_md: str
    explanation: str          # What the AI generated and why
    tools_used: list[str]     # Tools referenced in the definition
    warnings: list[str]       # Potential issues to review
    suggestions: list[str]    # Improvement suggestions


# === schemas/execution.py ===

class ExecutionRequest(BaseModel):
    agent_id: UUID
    trigger_type: str = "manual"  # manual | scheduled | webhook | event
    input_context: dict = Field(default_factory=dict)

class ExecutionResponse(BaseModel):
    execution_id: UUID
    agent_id: UUID
    agent_version: int
    status: str               # running | success | failed | timeout | cancelled
    output: dict | None
    llm_calls: int
    tokens_used: int
    started_at: datetime
    completed_at: datetime | None
    duration_seconds: float | None
    error: str | None
```

### 5.4 SQLAlchemy Models

```python
# === models/agent.py ===

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.database import Base

class AgentDefinition(Base):
    __tablename__ = "agent_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="draft", index=True)
    definition_md = Column(Text, nullable=False)
    guardrails_md = Column(Text, nullable=True)
    tools_allowed = Column(JSONB, nullable=False, default=list)
    schedule = Column(JSONB, nullable=True)
    tags = Column(JSONB, nullable=False, default=list)
    created_by = Column(String(255), nullable=False, index=True)
    approved_by = Column(String(255), nullable=True)
    approval_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    last_execution_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Integer, default=0)  # Soft delete

    # Relationships
    executions = relationship("AgentExecution", back_populates="agent")
    versions_history = relationship("AgentVersion", back_populates="agent")

    __table_args__ = (
        Index("ix_agent_status_created", "status", "created_at"),
        Index("ix_agent_name_version", "name", "version", unique=True),
    )


class AgentVersion(Base):
    """Stores every version of an agent definition for audit trail."""
    __tablename__ = "agent_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agent_definitions.id"), nullable=False)
    version = Column(Integer, nullable=False)
    definition_md = Column(Text, nullable=False)
    tools_allowed = Column(JSONB, nullable=False)
    changed_by = Column(String(255), nullable=False)
    change_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    agent = relationship("AgentDefinition", back_populates="versions_history")


# === models/execution.py ===

class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agent_definitions.id"), nullable=False)
    agent_version = Column(Integer, nullable=False)
    trigger_type = Column(String(20), nullable=False)  # scheduled|manual|webhook|event
    status = Column(String(20), nullable=False, default="running", index=True)
    input_context = Column(JSONB, nullable=False, default=dict)
    output = Column(JSONB, nullable=True)
    llm_calls = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    estimated_cost = Column(Integer, default=0)  # Cost in microdollars (avoid float)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_log = Column(Text, nullable=True)

    agent = relationship("AgentDefinition", back_populates="executions")
    tool_calls = relationship("ToolCallLog", back_populates="execution")

    __table_args__ = (
        Index("ix_execution_agent_started", "agent_id", "started_at"),
        Index("ix_execution_status", "status"),
    )


class ToolCallLog(Base):
    __tablename__ = "tool_call_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("agent_executions.id"), nullable=False)
    tool_name = Column(String(100), nullable=False)
    call_order = Column(Integer, nullable=False)  # Sequence within execution
    input_params = Column(JSONB, nullable=False)
    output_data = Column(JSONB, nullable=True)
    status = Column(String(20), nullable=False)  # success|failed|timeout|blocked
    duration_ms = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)
    called_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    execution = relationship("AgentExecution", back_populates="tool_calls")


# === models/tool.py ===

class ToolRegistryEntry(Base):
    __tablename__ = "tool_registry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    tier = Column(String(20), nullable=False)  # read_only|notify|write|sensitive
    tool_type = Column(String(30), nullable=False)  # api_call|database_query|n8n_workflow|python_function
    implementation = Column(JSONB, nullable=False)  # Connection details, endpoint, etc.
    input_schema = Column(JSONB, nullable=False)    # JSON Schema for tool inputs
    output_schema = Column(JSONB, nullable=True)    # JSON Schema for tool outputs
    rate_limit_per_execution = Column(Integer, default=100)
    rate_limit_per_day = Column(Integer, default=10000)
    requires_approval = Column(Integer, default=0)  # Boolean as int
    enabled = Column(Integer, default=1)
    managed_by = Column(String(255), nullable=False)
    documentation_md = Column(Text, nullable=True)  # Usage docs shown in tool browser
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
```

### 5.5 Sample Tool Registry Entry

```python
# Seed data for initial tool registry

SEED_TOOLS = [
    {
        "name": "salesforce_query",
        "display_name": "Salesforce Query (Read-Only)",
        "description": "Execute SOQL queries against Salesforce to read data. "
                       "Supports all standard and custom objects. Read-only — "
                       "cannot create, update, or delete records.",
        "tier": "read_only",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "sf_cli",
            "command": "sf data query --query \"{soql}\" --target-org {org} --json",
            "default_org": "prod",
            "allowed_orgs": ["prod"],
            "timeout_seconds": 30
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "soql": {"type": "string", "description": "SOQL query to execute"},
                "org": {"type": "string", "enum": ["prod"], "default": "prod"}
            },
            "required": ["soql"]
        },
        "rate_limit_per_execution": 20,
        "rate_limit_per_day": 5000,
        "requires_approval": False,
        "managed_by": "revops",
        "documentation_md": "## Salesforce Query\n\nUse SOQL to read data...",
    },
    {
        "name": "sf_record_update",
        "display_name": "Salesforce Record Update",
        "description": "Update existing Salesforce records. Requires specifying "
                       "object type, record ID, and fields to update.",
        "tier": "write",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "sf_cli",
            "command": "sf data update record --sobject {object} --record-id {record_id} "
                       "--values \"{fields}\" --target-org {org} --json",
            "default_org": "prod",
            "allowed_orgs": ["prod"],
            "timeout_seconds": 15
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "object": {"type": "string", "description": "SObject API name"},
                "record_id": {"type": "string", "description": "18-char record ID"},
                "fields": {"type": "object", "description": "Field:Value pairs to update"}
            },
            "required": ["object", "record_id", "fields"]
        },
        "rate_limit_per_execution": 10,
        "rate_limit_per_day": 500,
        "requires_approval": False,
        "managed_by": "revops",
    },
    {
        "name": "slack_notify",
        "display_name": "Slack Notification",
        "description": "Send messages to Slack channels. Supports formatting, "
                       "mentions, and attachments.",
        "tier": "notify",
        "tool_type": "api_call",
        "implementation": {
            "endpoint": "slack_api",
            "method": "chat.postMessage",
            "allowed_channels": ["#finance", "#critical-cases", "#general", "#revops"],
            "timeout_seconds": 10
        },
        "input_schema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "Slack channel name"},
                "message": {"type": "string", "description": "Message text (supports Slack markdown)"},
                "thread_ts": {"type": "string", "description": "Thread timestamp for replies"}
            },
            "required": ["channel", "message"]
        },
        "rate_limit_per_execution": 5,
        "rate_limit_per_day": 200,
        "requires_approval": False,
        "managed_by": "revops",
    },
]
```

---

## 6. Agent Runtime Implementation Plan

### 6.1 Execution Lifecycle

```python
# === runtime/executor.py ===

import asyncio
import time
from datetime import datetime, timezone
from uuid import UUID

from anthropic import Anthropic

from app.runtime.md_parser import parse_agent_md
from app.runtime.prompt_builder import build_system_prompt
from app.runtime.tool_loader import load_tools
from app.runtime.guardrails import inject_guardrails, enforce_runtime_limits
from app.runtime.output_filter import filter_output
from app.models.execution import AgentExecution, ToolCallLog


class AgentExecutor:
    """Core agent execution engine. Interprets Agent MD definitions
    and runs them via the Claude Agent SDK tool-calling loop."""

    def __init__(self, db_session, tool_registry):
        self.db = db_session
        self.tool_registry = tool_registry
        self.client = Anthropic()

    async def execute(
        self,
        agent_definition: dict,      # Parsed agent record from DB
        input_context: dict,
        execution_id: UUID,
        trigger_type: str = "manual"
    ) -> dict:
        """Main execution entry point."""

        start_time = time.time()
        llm_calls = 0
        tokens_used = 0
        tool_call_logs = []

        try:
            # Step 1: Parse the Agent MD into structured config
            agent_config = parse_agent_md(agent_definition["definition_md"])

            # Step 2: Validate tools against registry
            allowed_tools = self._validate_tools(
                agent_config["tools"],
                agent_definition["tools_allowed"]
            )

            # Step 3: Build system prompt with guardrails
            guardrails = inject_guardrails(
                agent_config=agent_config,
                static_guardrails=self._get_static_guardrails(),
                dynamic_context={
                    "tools_used": [t["name"] for t in allowed_tools],
                    "has_write_tools": any(t["tier"] == "write" for t in allowed_tools),
                    "has_sensitive_tools": any(t["tier"] == "sensitive" for t in allowed_tools),
                }
            )

            system_prompt = build_system_prompt(
                persona=agent_config.get("persona", "Professional and helpful assistant."),
                instructions=agent_config["instructions"],
                guardrails=guardrails,
                input_context=input_context
            )

            # Step 4: Load tool implementations
            tool_implementations = load_tools(
                allowed_tools,
                self.tool_registry,
                execution_id=execution_id,
                rate_limits=self._get_rate_limits(allowed_tools)
            )

            # Step 5: Get constraints
            constraints = agent_config.get("constraints", {})
            max_llm_calls = min(constraints.get("max_llm_calls", 50), 100)  # Hard cap at 100
            max_execution_time = min(constraints.get("max_execution_time", 300), 600)  # Hard cap 10min
            max_tokens = min(constraints.get("max_tokens_per_call", 4096), 8192)

            # Step 6: Execute the agent loop
            messages = []
            if input_context:
                messages.append({
                    "role": "user",
                    "content": self._format_input_context(input_context, agent_config)
                })
            else:
                messages.append({
                    "role": "user",
                    "content": "Execute your instructions now."
                })

            result = None

            while llm_calls < max_llm_calls:
                # Check timeout
                elapsed = time.time() - start_time
                if elapsed > max_execution_time:
                    raise TimeoutError(
                        f"Execution exceeded {max_execution_time}s limit"
                    )

                # Call Claude
                response = self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=max_tokens,
                    system=system_prompt,
                    messages=messages,
                    tools=[t.to_claude_tool() for t in tool_implementations],
                )

                llm_calls += 1
                tokens_used += response.usage.input_tokens + response.usage.output_tokens

                # Process response
                if response.stop_reason == "end_turn":
                    # Agent is done
                    result = self._extract_text_result(response)
                    break

                elif response.stop_reason == "tool_use":
                    # Process tool calls
                    tool_results = []
                    for content_block in response.content:
                        if content_block.type == "tool_use":
                            tool_log = await self._execute_tool_call(
                                content_block,
                                tool_implementations,
                                execution_id,
                                len(tool_call_logs) + 1
                            )
                            tool_call_logs.append(tool_log)
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": content_block.id,
                                "content": tool_log["output"] if tool_log["status"] == "success"
                                          else f"Error: {tool_log['error']}"
                            })

                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})

                else:
                    break  # Unexpected stop reason

            # Step 7: Filter output
            if result:
                result = filter_output(result)

            return {
                "status": "success",
                "output": result,
                "llm_calls": llm_calls,
                "tokens_used": tokens_used,
                "tool_calls": tool_call_logs,
                "duration_seconds": time.time() - start_time,
            }

        except TimeoutError as e:
            return {
                "status": "timeout",
                "error": str(e),
                "llm_calls": llm_calls,
                "tokens_used": tokens_used,
                "tool_calls": tool_call_logs,
                "duration_seconds": time.time() - start_time,
            }

        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "llm_calls": llm_calls,
                "tokens_used": tokens_used,
                "tool_calls": tool_call_logs,
                "duration_seconds": time.time() - start_time,
            }

    async def _execute_tool_call(
        self, tool_block, tool_implementations, execution_id, call_order
    ) -> dict:
        """Execute a single tool call with logging and enforcement."""
        tool_name = tool_block.name
        tool_input = tool_block.input
        start = time.time()

        try:
            # Find tool implementation
            tool = next((t for t in tool_implementations if t.name == tool_name), None)
            if not tool:
                return {
                    "tool_name": tool_name,
                    "input": tool_input,
                    "output": None,
                    "status": "blocked",
                    "error": f"Tool '{tool_name}' not in allowed list",
                    "duration_ms": 0,
                }

            # Execute
            output = await tool.execute(tool_input)

            return {
                "tool_name": tool_name,
                "input": tool_input,
                "output": output,
                "status": "success",
                "error": None,
                "duration_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            return {
                "tool_name": tool_name,
                "input": tool_input,
                "output": None,
                "status": "failed",
                "error": str(e),
                "duration_ms": int((time.time() - start) * 1000),
            }

    def _get_static_guardrails(self) -> str:
        return """
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
"""
```

### 6.2 MD Parser

```python
# === runtime/md_parser.py ===

import re
from typing import Any

def parse_agent_md(md_content: str) -> dict:
    """Parse an Agent MD definition into structured configuration."""

    config = {
        "name": None,
        "metadata": {},
        "description": "",
        "persona": "",
        "instructions": {"steps": [], "decision_logic": []},
        "tools": [],
        "schedule": {},
        "inputs": [],
        "outputs": [],
        "constraints": {},
        "tags": [],
    }

    # Extract agent name from H1
    h1_match = re.search(r'^# Agent:\s*(.+)$', md_content, re.MULTILINE)
    if h1_match:
        config["name"] = h1_match.group(1).strip()

    # Split into sections by H2
    sections = re.split(r'^## ', md_content, flags=re.MULTILINE)

    for section in sections[1:]:  # Skip content before first H2
        lines = section.strip().split('\n')
        section_name = lines[0].strip().lower()
        section_body = '\n'.join(lines[1:]).strip()

        if section_name == "metadata":
            config["metadata"] = _parse_metadata(section_body)
        elif section_name == "description":
            config["description"] = section_body
        elif section_name == "persona":
            config["persona"] = section_body
        elif section_name.startswith("instruction"):
            config["instructions"] = _parse_instructions(section_body)
        elif section_name == "tools":
            config["tools"] = _parse_tools(section_body)
        elif section_name == "schedule":
            config["schedule"] = _parse_metadata(section_body)
        elif section_name == "inputs":
            config["inputs"] = _parse_table(section_body)
        elif section_name == "outputs":
            config["outputs"] = _parse_table(section_body)
        elif section_name == "constraints":
            config["constraints"] = _parse_constraints(section_body)
        elif section_name == "tags":
            config["tags"] = [t.strip() for t in section_body.split(',')]

    return config


def _parse_metadata(body: str) -> dict:
    """Parse key-value list items like '- **Key:** Value'."""
    result = {}
    for match in re.finditer(r'-\s*\*\*(.+?)\*\*:?\s*(.+)', body):
        key = match.group(1).strip().lower().replace(' ', '_')
        value = match.group(2).strip()
        result[key] = value
    return result


def _parse_instructions(body: str) -> dict:
    """Parse instructions section with Steps and Decision Logic subsections."""
    result = {"preamble": "", "steps": [], "decision_logic": []}

    # Split by H3
    subsections = re.split(r'^### ', body, flags=re.MULTILINE)

    # Preamble (before first H3)
    if subsections[0].strip():
        result["preamble"] = subsections[0].strip()

    for sub in subsections[1:]:
        sub_lines = sub.strip().split('\n')
        sub_name = sub_lines[0].strip().lower()
        sub_body = '\n'.join(sub_lines[1:]).strip()

        if sub_name == "steps":
            # Parse numbered list
            result["steps"] = re.findall(r'^\d+\.\s*(.+)', sub_body, re.MULTILINE)

        elif sub_name.startswith("decision"):
            # Parse conditional rules
            for match in re.finditer(
                r'-\s*\*\*(If|Default)\*\*:?\s*(.+?):\s*(.+)', sub_body
            ):
                result["decision_logic"].append({
                    "condition": match.group(2).strip() if match.group(1) == "If" else "default",
                    "action": match.group(3).strip()
                })

    return result


def _parse_tools(body: str) -> list[dict]:
    """Parse tool list items like '- **tool_name**: description'."""
    tools = []
    for match in re.finditer(r'-\s*\*\*(.+?)\*\*:?\s*(.+)', body):
        tools.append({
            "name": match.group(1).strip(),
            "usage_description": match.group(2).strip()
        })
    return tools


def _parse_table(body: str) -> list[dict]:
    """Parse markdown table into list of dicts."""
    rows = []
    lines = [l.strip() for l in body.split('\n') if l.strip() and not l.strip().startswith('|---')]
    if not lines:
        return rows

    # Get headers from first row
    headers = [h.strip() for h in lines[0].split('|')[1:-1]]

    for line in lines[1:]:
        cells = [c.strip() for c in line.split('|')[1:-1]]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))

    return rows


def _parse_constraints(body: str) -> dict:
    """Parse constraints as key-value pairs."""
    constraints = {}
    mapping = {
        "max llm calls": "max_llm_calls",
        "max execution time": "max_execution_time",
        "max tokens per call": "max_tokens_per_call",
        "retry on failure": "retry_on_failure",
        "max retries": "max_retries",
    }
    for match in re.finditer(r'-\s*(.+?):\s*(.+)', body):
        key = match.group(1).strip().lower()
        value = match.group(2).strip()
        if key in mapping:
            # Convert to appropriate type
            if value.lower() in ("yes", "true"):
                constraints[mapping[key]] = True
            elif value.lower() in ("no", "false"):
                constraints[mapping[key]] = False
            else:
                try:
                    constraints[mapping[key]] = int(value)
                except ValueError:
                    constraints[mapping[key]] = value
    return constraints
```

### 6.3 Prompt Builder

```python
# === runtime/prompt_builder.py ===

def build_system_prompt(
    persona: str,
    instructions: dict,
    guardrails: str,
    input_context: dict
) -> str:
    """Assemble the full system prompt for the Claude agent."""

    prompt_parts = []

    # 1. Guardrails first (highest priority)
    prompt_parts.append(guardrails)

    # 2. Persona
    prompt_parts.append(f"## Your Persona\n{persona}")

    # 3. Instructions
    instructions_text = "## Your Instructions\n"
    if instructions.get("preamble"):
        instructions_text += f"{instructions['preamble']}\n\n"

    if instructions.get("steps"):
        instructions_text += "### Steps\n"
        for i, step in enumerate(instructions["steps"], 1):
            instructions_text += f"{i}. {step}\n"
        instructions_text += "\n"

    if instructions.get("decision_logic"):
        instructions_text += "### Decision Logic\n"
        for rule in instructions["decision_logic"]:
            if rule["condition"] == "default":
                instructions_text += f"- **Default:** {rule['action']}\n"
            else:
                instructions_text += f"- **If** {rule['condition']}: {rule['action']}\n"

    prompt_parts.append(instructions_text)

    # 4. Input context
    if input_context:
        context_text = "## Input Context\n"
        context_text += "The following data has been provided for this execution:\n\n"
        context_text += "```json\n"
        import json
        context_text += json.dumps(input_context, indent=2)
        context_text += "\n```\n"
        prompt_parts.append(context_text)

    # 5. Output instructions
    prompt_parts.append(
        "## Output Format\n"
        "When you have completed your task, provide your final response as a clear, "
        "structured summary. Include any relevant data, actions taken, and recommendations. "
        "If you encountered any issues or uncertainties, note them explicitly."
    )

    return "\n\n".join(prompt_parts)
```

### 6.4 Guardrail Injection

```python
# === runtime/guardrails.py ===

def inject_guardrails(
    agent_config: dict,
    static_guardrails: str,
    dynamic_context: dict
) -> str:
    """Build the complete guardrails section for an agent execution."""

    parts = [static_guardrails]

    # Dynamic guardrails based on tools and context
    if dynamic_context.get("has_write_tools"):
        parts.append("""
## WRITE OPERATION GUARDRAILS
- Before updating any record, verify the record ID is valid
- Never bulk-update more than 50 records in a single execution
- Log every write operation with before/after values
- If a write fails, do not retry automatically — report the failure
""")

    if dynamic_context.get("has_sensitive_tools"):
        parts.append("""
## SENSITIVE DATA GUARDRAILS
- Minimize data retrieval — query only fields you need
- Never store sensitive data in your output
- Mask any financial amounts over $10,000 in logs as $XX,XXX
- Do not combine data from sensitive queries with data from other tools
""")

    # Check for specific tool patterns
    tool_names = dynamic_context.get("tools_used", [])

    if "salesforce_query" in tool_names:
        parts.append("""
## SALESFORCE GUARDRAILS
- Use LIMIT clauses in all SOQL queries (max 200 records)
- Never query User.Password or SecurityToken fields
- Prefer indexed fields in WHERE clauses for performance
- Use specific field lists instead of SELECT * patterns
""")

    if "slack_notify" in tool_names or "email_send" in tool_names:
        parts.append("""
## COMMUNICATION GUARDRAILS
- Keep messages professional and on-brand
- Never include raw error traces or stack traces in messages
- Include the agent name and execution ID for traceability
- Do not send more than 3 messages per execution
""")

    return "\n".join(parts)
```

### 6.5 Output Filter

```python
# === runtime/output_filter.py ===

import re

# PII detection patterns
PII_PATTERNS = [
    (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN-REDACTED]'),          # SSN
    (r'\b\d{9}\b', lambda m: m.group() if len(m.group()) != 9 else '[SSN-REDACTED]'),
    (r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[CC-REDACTED]'),  # Credit card
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', None),   # Email - keep (usually OK)
    (r'(?i)(password|secret|token|api.?key)\s*[:=]\s*\S+', '[CREDENTIAL-REDACTED]'),
]


def filter_output(output: str | dict) -> str | dict:
    """Filter PII and sensitive data from agent output."""
    if isinstance(output, dict):
        return {k: filter_output(v) for k, v in output.items()}
    if isinstance(output, list):
        return [filter_output(item) for item in output]
    if isinstance(output, str):
        filtered = output
        for pattern, replacement in PII_PATTERNS:
            if replacement:
                filtered = re.sub(pattern, replacement, filtered)
        return filtered
    return output
```

---

## 7. n8n Integration Plan

### 7.1 Agent Executor Workflow

The core n8n workflow handles all agent scheduling and execution:

```
Workflow: "Agent Executor"
Trigger: Multiple (see below)
    │
    ├── Cron Trigger ─────────────────────────────────────┐
    │   (per-agent schedule from DB)                       │
    │                                                       │
    ├── Webhook Trigger ──────────────────────────────────┐│
    │   POST /webhook/agent-trigger                        ││
    │   Body: {agent_id, trigger_type, input_context}      ││
    │                                                       ││
    ├── Manual Trigger ───────────────────────────────────┐││
    │                                                      │││
    ▼                                                      │││
┌──────────────────────┐                                   │││
│ 1. Parse Trigger     │◄──────────────────────────────────┘││
│    Extract agent_id  │◄───────────────────────────────────┘│
│    + input_context   │◄────────────────────────────────────┘
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Fetch Agent       │
│    GET /api/agents/  │
│    {agent_id}        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌─────────────────┐
│ 3. Validate Status   │────►│ Status != active │──► Error notification
│    agent.status ==   │     │ → STOP           │
│    "active"          │     └─────────────────┘
└──────────┬───────────┘
           │ (active)
           ▼
┌──────────────────────┐
│ 4. Execute Agent     │
│    POST /api/exec/   │
│    run               │
│    {agent_id,        │
│     trigger_type,    │
│     input_context}   │
│                      │
│    timeout: 10 min   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. Check Result      │
│                      │
│  ┌─ success ─────────┤──► Log success, optional notification
│  │                   │
│  ├─ failed ──────────┤──► Log failure, send error alert
│  │                   │
│  ├─ timeout ─────────┤──► Log timeout, send alert
│  │                   │
│  └─ needs_approval ──┤──► Trigger approval sub-workflow
│                      │
└──────────────────────┘
```

### 7.2 Schedule Manager

When an agent is activated, the backend API creates/updates a cron trigger in n8n:

```python
# === services/n8n_service.py ===

import httpx

class N8nService:
    """Manages n8n workflow triggers for scheduled agents."""

    def __init__(self, n8n_base_url: str, n8n_api_key: str):
        self.base_url = n8n_base_url
        self.api_key = n8n_api_key

    async def register_schedule(self, agent_id: str, schedule: dict):
        """Register or update a cron schedule for an agent in n8n."""
        # Option A: Use n8n API to enable/configure workflow trigger
        # Option B: Use a single polling workflow that checks DB for due agents
        # Recommendation: Option B — simpler, single workflow to manage
        pass

    async def remove_schedule(self, agent_id: str):
        """Remove schedule when agent is disabled."""
        pass
```

**Recommended approach: DB-polling pattern**

Rather than creating individual n8n workflows per agent, use a single "Schedule Checker" workflow:

```
Workflow: "Schedule Checker"
Trigger: Cron (every 1 minute)
    │
    ▼
┌──────────────────────┐
│ Query DB for agents   │
│ WHERE status='active' │
│ AND schedule IS NOT   │
│ NULL AND next_run_at  │
│ <= NOW()              │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│ For each due agent:   │
│ POST /webhook/        │
│ agent-trigger         │
│ {agent_id, "scheduled"}│
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│ Update next_run_at    │
│ based on cron         │
│ expression            │
└───────────────────────┘
```

### 7.3 Approval Sub-Workflow

For agents that trigger write/sensitive operations requiring human approval:

```
Workflow: "Agent Approval Gate"
    │
    ▼
┌──────────────────────┐
│ Receive approval      │
│ request from executor │
│ {execution_id, action,│
│  agent_name, details} │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│ Send Slack message    │
│ to #agent-approvals   │
│ with Approve/Reject   │
│ buttons               │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│ Wait for response     │
│ (timeout: 30 min)     │
└──────────┬────────────┘
           │
     ┌─────┴─────┐
     │           │
  Approved    Rejected/Timeout
     │           │
     ▼           ▼
  Resume      Cancel execution
  execution   Log rejection
```

---

## 8. Security & Governance Plan

### 8.1 Change Control Workflow

```
        ┌──────────┐
        │  DRAFT   │ ← Business user creates/edits
        └────┬─────┘
             │ submit_for_review()
             ▼
     ┌───────────────┐
     │ PENDING_REVIEW │ ← Reviewer gets notification
     └───────┬───────┘
             │
      ┌──────┴──────┐
      │             │
   approve()     reject(reason)
      │             │
      ▼             ▼
 ┌──────────┐  ┌──────────┐
 │ APPROVED │  │  DRAFT   │ ← Returns with feedback
 └────┬─────┘  └──────────┘
      │ activate()
      ▼
 ┌──────────┐
 │  ACTIVE  │ ← Running in production
 └────┬─────┘
      │ disable(reason)
      ▼
 ┌──────────┐
 │ DISABLED │ ← Stopped, can be re-activated
 └──────────┘
```

**Rules:**
- Only the author can edit a **draft** agent
- Only users with **reviewer** role can approve/reject
- Only users with **admin** role can activate (deploy to production)
- **Active** agents can be disabled by anyone with admin role (emergency stop)
- Every state transition is logged with timestamp, user, and reason

### 8.2 Role-Based Access Control (RBAC)

| Role | Create | Edit Own | Edit Any | Review | Activate | Disable | Manage Tools | View All |
|------|--------|----------|----------|--------|----------|---------|-------------|----------|
| **user** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Own only |
| **reviewer** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **revops** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 8.3 Audit Trail

Every significant action is logged to an `audit_log` table:

```python
class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False)     # agent | tool | execution | user
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(50), nullable=False)          # created | updated | submitted | approved | etc.
    actor = Column(String(255), nullable=False)
    details = Column(JSONB, nullable=True)               # Before/after values, reason, etc.
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_actor", "actor"),
        Index("ix_audit_created", "created_at"),
    )
```

### 8.4 Credential Management

- **No credentials in agent definitions** — agents reference tools by name only
- **Tool implementations** store credential references, not actual credentials
- **Actual credentials** live in environment variables on the VPS, never in the database
- **Tool registry** stores a `credential_ref` that maps to an env var name:

```python
# Tool implementation config
{
    "endpoint": "slack_api",
    "credential_ref": "SLACK_BOT_TOKEN",   # Maps to env var
    "method": "chat.postMessage"
}

# At runtime, the tool loader resolves:
import os
token = os.environ[tool.implementation["credential_ref"]]
```

### 8.5 Network Security

- Backend API authenticated via JWT tokens (user sessions) and API keys (n8n/service calls)
- All internal communication over HTTPS
- Agent runtime runs in the same Docker network as the API (no external exposure)
- Outbound connections from tools are allowlisted:
  - Salesforce API endpoints (`*.salesforce.com`)
  - Slack API (`slack.com`)
  - Google APIs (`*.googleapis.com`)
  - No arbitrary HTTP requests unless explicitly enabled per-tool

---

## 9. Database Design

### 9.1 Complete Schema

```sql
-- =====================================================
-- AgentForge Database Schema
-- PostgreSQL 16+
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Users & Auth
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'reviewer', 'admin', 'revops')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_role ON users(role);

-- =====================================================
-- Agent Definitions
-- =====================================================

CREATE TABLE agent_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'disabled')),
    definition_md TEXT NOT NULL,
    guardrails_md TEXT,
    tools_allowed JSONB NOT NULL DEFAULT '[]'::jsonb,
    schedule JSONB,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,
    rejection_reason TEXT,
    next_run_at TIMESTAMPTZ,  -- For schedule management
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_execution_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,

    UNIQUE(name, version)
);

CREATE INDEX ix_agent_status ON agent_definitions(status);
CREATE INDEX ix_agent_created_by ON agent_definitions(created_by);
CREATE INDEX ix_agent_status_created ON agent_definitions(status, created_at);
CREATE INDEX ix_agent_next_run ON agent_definitions(next_run_at)
    WHERE status = 'active' AND next_run_at IS NOT NULL;
CREATE INDEX ix_agent_tags ON agent_definitions USING GIN(tags);

-- =====================================================
-- Agent Version History (immutable audit trail)
-- =====================================================

CREATE TABLE agent_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agent_definitions(id),
    version INTEGER NOT NULL,
    definition_md TEXT NOT NULL,
    tools_allowed JSONB NOT NULL,
    schedule JSONB,
    changed_by UUID NOT NULL REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(agent_id, version)
);

CREATE INDEX ix_version_agent ON agent_versions(agent_id, version);

-- =====================================================
-- Tool Registry
-- =====================================================

CREATE TABLE tool_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    tier VARCHAR(20) NOT NULL
        CHECK (tier IN ('read_only', 'notify', 'write', 'sensitive')),
    tool_type VARCHAR(30) NOT NULL
        CHECK (tool_type IN ('api_call', 'database_query', 'n8n_workflow', 'python_function')),
    implementation JSONB NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB,
    rate_limit_per_execution INTEGER NOT NULL DEFAULT 100,
    rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    managed_by UUID NOT NULL REFERENCES users(id),
    documentation_md TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_tool_name ON tool_registry(name);
CREATE INDEX ix_tool_tier ON tool_registry(tier);

-- =====================================================
-- Agent Executions
-- =====================================================

CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agent_definitions(id),
    agent_version INTEGER NOT NULL,
    trigger_type VARCHAR(20) NOT NULL
        CHECK (trigger_type IN ('scheduled', 'manual', 'webhook', 'event', 'simulation')),
    status VARCHAR(20) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'failed', 'timeout', 'cancelled')),
    input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    output JSONB,
    llm_calls INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    estimated_cost_micros INTEGER NOT NULL DEFAULT 0,  -- Cost in microdollars
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_log TEXT,
    initiated_by UUID REFERENCES users(id)  -- NULL for scheduled runs
);

CREATE INDEX ix_exec_agent ON agent_executions(agent_id, started_at DESC);
CREATE INDEX ix_exec_status ON agent_executions(status);
CREATE INDEX ix_exec_started ON agent_executions(started_at DESC);

-- Partition by month for performance (optional, implement when volume warrants)
-- CREATE TABLE agent_executions ... PARTITION BY RANGE (started_at);

-- =====================================================
-- Tool Call Logs
-- =====================================================

CREATE TABLE tool_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    call_order INTEGER NOT NULL,
    input_params JSONB NOT NULL,
    output_data JSONB,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('success', 'failed', 'timeout', 'blocked', 'rate_limited')),
    duration_ms INTEGER,
    error TEXT,
    called_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_toolcall_execution ON tool_call_logs(execution_id, call_order);

-- =====================================================
-- Audit Log
-- =====================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor UUID NOT NULL REFERENCES users(id),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX ix_audit_actor ON audit_log(actor);
CREATE INDEX ix_audit_created ON audit_log(created_at DESC);

-- =====================================================
-- API Keys (for n8n + service authentication)
-- =====================================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,  -- bcrypt hash of the API key
    role VARCHAR(20) NOT NULL DEFAULT 'service',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_apikey_hash ON api_keys(key_hash);
```

### 9.2 Migration Strategy

- **Tool:** Alembic (SQLAlchemy's migration companion)
- **Initial migration:** Full schema creation (V001)
- **Seed data:** Tool registry entries, default admin user, initial API key
- **Convention:** One migration per feature/change, descriptive names
- **Rollback:** Every migration must have a working `downgrade()`

```
alembic/versions/
├── 001_initial_schema.py
├── 002_seed_tool_registry.py
├── 003_seed_default_users.py
└── ...
```

---

## 10. Deployment Plan

### 10.1 Docker Configuration

```dockerfile
# === Dockerfile ===

# Stage 1: Frontend build
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY agent-platform-ui/package*.json ./
RUN npm ci
COPY agent-platform-ui/ ./
RUN npm run build

# Stage 2: Backend
FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY agent-platform-api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend code
COPY agent-platform-api/ ./

# Frontend static files (served by FastAPI)
COPY --from=frontend-build /app/frontend/dist ./static/

# Alembic migrations
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Startup script
COPY scripts/startup.sh ./
RUN chmod +x startup.sh

EXPOSE 8000

CMD ["./startup.sh"]
```

```bash
# === scripts/startup.sh ===
#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting AgentForge API..."
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --log-level info
```

```yaml
# === docker-compose.yml (local development) ===

version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: agentforge
      POSTGRES_USER: agentforge
      POSTGRES_PASSWORD: ${DB_PASSWORD:-localdev}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://agentforge:${DB_PASSWORD:-localdev}@db:5432/agentforge
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      SLACK_BOT_TOKEN: ${SLACK_BOT_TOKEN}
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-me}
      N8N_BASE_URL: ${N8N_BASE_URL:-http://localhost:5678}
      N8N_API_KEY: ${N8N_API_KEY}
    depends_on:
      - db
    volumes:
      - ./agent-platform-api:/app  # Hot reload in dev

  frontend:
    build:
      context: ./agent-platform-ui
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    volumes:
      - ./agent-platform-ui/src:/app/src  # Hot reload

volumes:
  pgdata:
```

### 10.2 CI/CD Pipeline

```yaml
# === .github/workflows/deploy.yml ===

name: Deploy AgentForge

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: sanguinebio/agentforge

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: agentforge_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd agent-platform-api
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx

      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/agentforge_test
        run: |
          cd agent-platform-api
          pytest tests/ -v

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Frontend tests
        run: |
          cd agent-platform-ui
          npm ci
          npm run lint
          npm run build  # Type check + build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      # Sevalla auto-deploys from the registry on push
      # Or trigger Sevalla deploy webhook:
      - name: Trigger Sevalla Deploy
        run: |
          curl -X POST "${{ secrets.SEVALLA_DEPLOY_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d '{"image": "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}"}'
```

### 10.3 Environment Strategy

| Environment | Purpose | URL | Auto-deploy |
|-------------|---------|-----|-------------|
| **local** | Development | localhost:8000 / :5173 | Docker Compose |
| **staging** | Integration testing | staging-agentforge.sevalla.app | On push to `staging` branch |
| **production** | Live | agentforge.sevalla.app | On push to `main` branch |

---

## 11. Phased Delivery Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Goal:** Backend API + database + basic agent CRUD

**Deliverables:**
- [ ] Project scaffolding (monorepo structure, Docker, CI/CD skeleton)
- [ ] PostgreSQL schema + Alembic migrations
- [ ] FastAPI backend with agent CRUD endpoints
- [ ] Agent lifecycle state machine (draft → review → approve → activate)
- [ ] Tool registry seeded with 3 initial tools (salesforce_query, slack_notify, google_sheets_read)
- [ ] Basic JWT authentication
- [ ] Unit tests for API endpoints
- [ ] Docker Compose for local dev

**Milestone:** Can create, update, and manage agent definitions via API (Postman/curl)

**Effort:** 3 weeks (1 developer)

---

### Phase 2: Agent Runtime (Weeks 4-6)

**Goal:** Execute agents from MD definitions

**Deliverables:**
- [ ] MD parser (parse agent definitions into structured config)
- [ ] System prompt builder (assemble persona + instructions + guardrails)
- [ ] Tool loader (resolve tool names to implementations from registry)
- [ ] Agent executor (Claude Agent SDK tool-calling loop)
- [ ] Static guardrail injection
- [ ] Execution logging (tool calls, tokens, duration)
- [ ] Output filter (PII detection)
- [ ] POST /api/exec/run endpoint
- [ ] Tool implementations: salesforce_query, slack_notify, google_sheets_read
- [ ] Integration tests with mock tools

**Milestone:** Can execute an agent definition end-to-end via API, with logged results

**Effort:** 3 weeks (1 developer)

---

### Phase 3: Frontend — Core UI (Weeks 7-9)

**Goal:** React app with dashboard and agent management

**Deliverables:**
- [ ] React + Vite + Tailwind project setup
- [ ] Authentication flow (login/logout)
- [ ] AppShell layout (sidebar, header, routing)
- [ ] Dashboard page (agent list, status overview, cost summary)
- [ ] Agent detail page (view definition, execution history)
- [ ] Agent editor page (Monaco editor, save/validate)
- [ ] Execution history page (list, detail view, tool call logs)
- [ ] Tool browser page
- [ ] API client layer (Axios + React Query)

**Milestone:** Fully functional web app for managing agents (without AI builder)

**Effort:** 3 weeks (1 developer, or faster with 2)

---

### Phase 4: AI Builder + n8n Integration (Weeks 10-12)

**Goal:** Natural language agent creation + scheduled execution

**Deliverables:**
- [ ] Builder service (Claude API integration for MD generation)
- [ ] Builder chat UI (conversational agent creation)
- [ ] Chat ↔ Editor sync (generated MD appears in editor, edits reflected)
- [ ] Validation service (real-time schema validation)
- [ ] n8n Agent Executor workflow
- [ ] n8n Schedule Checker workflow
- [ ] Schedule management (activate agent → register in n8n)
- [ ] Webhook trigger support
- [ ] Error notification flow (Slack alerts on failures)

**Milestone:** Business user can describe an agent in natural language, generate it, and it runs on schedule

**Effort:** 3 weeks (1 developer)

---

### Phase 5: Governance + Polish (Weeks 13-15)

**Goal:** Enterprise-grade governance, simulation, and operational readiness

**Deliverables:**
- [ ] RBAC enforcement (user/reviewer/admin/revops roles)
- [ ] Approval workflow UI (submit, review, approve/reject with notes)
- [ ] Audit log implementation + viewer
- [ ] Simulation/dry-run mode (mock tool responses)
- [ ] Dynamic guardrails (context-aware injection)
- [ ] Version diff viewer (compare agent versions)
- [ ] Cost tracking dashboard (per-agent, per-period)
- [ ] Additional tools: sf_record_update, email_send
- [ ] n8n approval sub-workflow (Slack-based human-in-the-loop)
- [ ] Security hardening (rate limiting, input sanitization, CORS)

**Milestone:** Platform is production-ready with full governance

**Effort:** 3 weeks (1-2 developers)

---

### Phase 6: Scale + Iterate (Weeks 16+)

**Goal:** Operational maturity and feature expansion

**Deliverables:**
- [ ] Agent templates library (pre-built agents users can customize)
- [ ] Agent performance analytics (success rates, avg execution time, cost trends)
- [ ] Bulk operations (enable/disable multiple agents)
- [ ] Agent sharing (clone another user's agent as starting point)
- [ ] Advanced scheduling (event-driven triggers from Salesforce Platform Events)
- [ ] Custom tool request workflow (business user requests new tool → RevOps implements)
- [ ] Multi-model support (swap Claude for other LLMs per-agent)
- [ ] API rate limit monitoring + alerts
- [ ] Documentation site for business users

**Milestone:** Self-service platform with minimal RevOps intervention for standard use cases

**Effort:** Ongoing

---

### Timeline Summary

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16+
       ├──────────┤                                        Phase 1: Foundation
                  ├──────────┤                             Phase 2: Runtime
                             ├──────────┤                  Phase 3: Frontend
                                        ├──────────┤       Phase 4: Builder + n8n
                                                   ├──────┤ Phase 5: Governance
                                                          ├──► Phase 6: Scale

MVP (usable by RevOps):     Week 6  ← API + Runtime
MVP (usable by business):   Week 12 ← Full UI + Builder
Production-ready:           Week 15 ← Governance + Polish
```

---

## 12. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Agent MD schema too rigid for complex use cases** | Medium | High | Start simple, iterate. Add `## Custom` section for freeform extensions. Complex cases go through RevOps as custom tools, not complex agent definitions. |
| R2 | **Claude API costs scale unexpectedly** | Medium | Medium | Per-agent token budgets, daily cost caps, cost alerts. Use claude-sonnet (not opus) for agent execution. Reserve opus for the builder AI only if needed. |
| R3 | **Business users create agents that produce incorrect/harmful outputs** | Medium | High | Guardrails + simulation mode + approval gates. No agent goes live without reviewer sign-off. Write-tier tools require approval. |
| R4 | **n8n becomes a bottleneck for execution** | Low | Medium | n8n handles orchestration only (lightweight). Heavy lifting is in the Python runtime. Can horizontally scale runtime workers independently. |
| R5 | **Tool implementations break due to external API changes** | Medium | Medium | Version tool implementations, automated health checks, circuit breakers. Slack/SF APIs are stable but monitor for deprecations. |
| R6 | **Single developer velocity limits delivery** | High | Medium | Prioritize ruthlessly. Phase 1+2 deliver a working system. UI (Phase 3) could be built by a second developer in parallel starting Week 4. |
| R7 | **MD parsing is fragile with varied user input** | Medium | Medium | Strict schema validation at save time. The builder AI generates conformant MD, reducing manual editing errors. Fallback: parse errors return clear messages. |
| R8 | **Security: prompt injection via agent definitions** | Low | High | Agent definitions are system prompts (not user input to the runtime). Tool allowlisting is enforced programmatically, not by prompt. Guardrails are injected, not user-editable. |
| R9 | **Scope creep: business users want features beyond platform capabilities** | High | Medium | Clear documentation of what the platform does and doesn't do. Custom requests go through RevOps tool development process. Agent templates guide users toward supported patterns. |
| R10 | **Database performance degrades with execution log volume** | Low | Medium | Partition agent_executions by month. Retention policy: archive executions older than 90 days. Index strategy covers common queries. |

---

## Appendix A: Agent MD → System Prompt Example

Given the Overdue Invoice Reminder agent from Section 3.2, the runtime would produce this system prompt:

```
## SYSTEM GUARDRAILS (enforced — cannot be overridden)

1. **PII Protection:** Never include SSN, DOB, financial account numbers,
   or passwords in your output. Mask sensitive data as [REDACTED].
2. **Scope Limitation:** Only use tools listed in your Tools section.
3. **Audit Compliance:** Every action you take is logged.
4. **Error Handling:** If a tool call fails, report the failure clearly.
5. **No External Communication:** Do not compose or suggest sending
   communications outside the approved channels.
6. **Data Minimization:** Query only the data you need.
7. **Factual Accuracy:** State uncertainty when present.
8. **Human Escalation:** Stop if outside your instructions.

## SALESFORCE GUARDRAILS
- Use LIMIT clauses in all SOQL queries (max 200 records)
- Never query User.Password or SecurityToken fields
- Use specific field lists instead of SELECT *

## COMMUNICATION GUARDRAILS
- Keep messages professional and on-brand
- Never include raw error traces in messages
- Include the agent name and execution ID for traceability
- Do not send more than 3 messages per execution

## Your Persona
Professional and concise. Use bullet points for clarity. Include invoice
numbers and amounts for easy reference. Flag anything over 90 days as urgent.

## Your Instructions
Query Salesforce for all open invoices where the due date has passed.
Group them by age buckets and format a clear summary for the finance team.

### Steps
1. Query Salesforce for all Invoice__c records where Status__c = 'Open'
   and Due_Date__c < TODAY
2. Group results into buckets: 1-30 days, 31-60 days, 61-90 days, 90+ days
3. Calculate total outstanding amount per bucket
4. Format a Slack message with the summary
5. If any invoices are 90+ days overdue, prefix with ":rotating_light: URGENT"
6. Send the summary to the #finance Slack channel

### Decision Logic
- **If** no overdue invoices found: Send "All clear — no overdue invoices today!"
- **If** total overdue > $100,000: Also send a DM to the CFO
- **Default:** Send standard summary to #finance

## Output Format
When you have completed your task, provide your final response as a clear,
structured summary. Include any relevant data, actions taken, and recommendations.
```

---

## Appendix B: Project Repository Structure

```
sanguinebio/agentforge/
├── agent-platform-api/          # Python FastAPI backend
│   ├── app/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── agent-platform-ui/           # React TypeScript frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   ├── startup.sh
│   ├── seed_tools.py
│   └── seed_users.py
├── n8n/
│   ├── agent-executor.json      # n8n workflow export
│   ├── schedule-checker.json
│   └── approval-gate.json
├── docs/
│   ├── agent-schema.md
│   ├── tool-development.md
│   └── user-guide.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       └── deploy.yml
├── PLAN.md                      # This document
└── README.md
```

---

*End of Implementation Plan — AgentForge v1.0*
