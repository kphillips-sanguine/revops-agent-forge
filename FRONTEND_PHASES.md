# AgentForge Frontend — Build Phases for Claude Code

> Each phase is a standalone Claude Code task. Run them in order — each builds on the previous.
> All work happens in `C:\code\agent-platform\agent-platform-ui\`

---

## Phase F1: Project Scaffold + Layout Shell

**Estimated time:** 15-20 min
**Dependencies:** None (greenfield)

### Task Description

Scaffold a React + TypeScript + Vite project with Tailwind CSS, React Router, and Zustand. Build the app shell layout with sidebar navigation, header, and routing to placeholder pages.

### Requirements

1. **Project setup:**
   - React 19 + TypeScript + Vite
   - Tailwind CSS v4 (utility-first styling)
   - React Router v7 (client-side routing)
   - Zustand v5 (state management)
   - @tanstack/react-query v5 (server state)
   - Axios (HTTP client)
   - lucide-react (icons)
   - date-fns (date formatting)

2. **App shell layout (`AppShell.tsx`):**
   - Collapsible left sidebar (240px expanded, 64px collapsed)
   - Top header bar with app name "AgentForge" and user avatar/menu placeholder
   - Main content area that fills remaining space
   - Dark theme with amber accent (#F59E0B) — professional, not playful

3. **Sidebar navigation items:**
   - 🏠 Dashboard (`/`)
   - ➕ Builder (`/builder`)
   - 📋 Agents (`/agents`)
   - ⚡ Executions (`/executions`)
   - 🔧 Tools (`/tools`)
   - ⚙️ Settings (`/settings`)

4. **Placeholder pages** (just the title + "Coming soon" for each route):
   - `DashboardPage.tsx`
   - `BuilderPage.tsx`
   - `AgentsPage.tsx` (list) + `AgentDetailPage.tsx` (`:id`)
   - `ExecutionsPage.tsx`
   - `ToolsPage.tsx`
   - `SettingsPage.tsx`

5. **API client scaffold (`src/api/client.ts`):**
   - Axios instance with base URL from `VITE_API_BASE_URL` env var
   - Request/response interceptors (log errors, attach auth header placeholder)

6. **Auth store placeholder (`src/stores/authStore.ts`):**
   - Zustand store with `user`, `isAuthenticated`, `login()`, `logout()`
   - Hardcode a mock user for now: `{ email: "kevin@sanguinebio.com", name: "Kevin Phillips", role: "revops" }`

7. **TypeScript types (`src/types/`):**
   - `agent.ts` — Agent interfaces matching this schema:
     ```typescript
     interface Agent {
       id: string;
       name: string;
       version: number;
       status: 'draft' | 'pending_review' | 'approved' | 'active' | 'disabled';
       definition_md: string;
       guardrails_md: string | null;
       tools_allowed: string[];
       schedule: AgentSchedule | null;
       tags: string[];
       created_by: string;
       approved_by: string | null;
       created_at: string;
       updated_at: string;
       last_execution_at: string | null;
       execution_count: number;
       estimated_cost: number;
     }
     ```
   - `execution.ts` — Execution interfaces
   - `tool.ts` — Tool interfaces

### Acceptance Criteria
- `npm run dev` starts and shows the app shell
- Sidebar navigation works (clicking routes shows correct placeholder page)
- Sidebar collapses/expands
- Dark theme with amber accents looks professional
- No TypeScript errors, no console errors
- All type files created with complete interfaces

---

## Phase F2: Dashboard + Agent List

**Estimated time:** 20-30 min
**Dependencies:** Phase F1 complete

### Task Description

Build the Dashboard page with overview stat cards and the Agents list page with a filterable, sortable table. Use mock data (no real API yet).

### Requirements

1. **Mock data layer (`src/mocks/`):**
   Create `agents.ts` and `executions.ts` with realistic mock data:
   - 6-8 mock agents in various statuses (2 active, 1 pending_review, 2 draft, 1 disabled)
   - Use realistic names: "Overdue Invoice Reminder", "Case Triage Bot", "Weekly Sales Report", "Data Quality Checker", "New Lead Notifier", "Contract Expiry Alert"
   - 15-20 mock executions across those agents with varied statuses and timestamps

2. **Dashboard page (`DashboardPage.tsx`):**
   - **Overview cards row** (4 cards):
     - Active Agents (count, green)
     - Pending Review (count, amber)
     - Executions This Week (count, blue)
     - Estimated Cost (dollar amount, neutral)
   - **Recent agents table** (top 5 by last_execution_at):
     - Columns: Name, Status (badge), Last Run (relative time), Runs (count), Success Rate (%), Cost
     - Click row → navigate to `/agents/:id`
   - **Recent executions list** (latest 5):
     - Agent name, trigger type, status badge, duration, timestamp
     - Click → navigate to `/executions/:id`
   - Responsive grid: cards in 4-col on desktop, 2-col on tablet, 1-col on mobile

3. **Agents list page (`AgentsPage.tsx`):**
   - **Filter bar:**
     - Status dropdown (All, Draft, Pending Review, Approved, Active, Disabled)
     - Search by name (debounced text input)
     - Tag filter (multi-select or text input)
   - **Agents table:**
     - Columns: Name, Status (colored badge), Author, Version, Last Run, Runs, Success Rate, Cost, Actions
     - Sortable by: Name, Status, Last Run, Runs, Cost
     - Actions column: View, Edit (if draft), Disable (if active)
   - **"+ New Agent" button** → navigates to `/builder`
   - Empty state when filters return no results

4. **Status badge component (`StatusBadge.tsx`):**
   - draft → gray
   - pending_review → amber/yellow
   - approved → blue
   - active → green
   - disabled → red/muted

5. **Zustand agent store (`src/stores/agentStore.ts`):**
   - State: `agents[]`, `isLoading`, `error`, `filters`
   - Actions: `fetchAgents()`, `setFilter()`, `getAgentById()`
   - Initially loads from mock data
   - Will later swap to API calls

### Acceptance Criteria
- Dashboard shows all 4 stat cards with correct computed values from mock data
- Agent table displays all mock agents with correct status badges
- Filters work (status dropdown filters table, search filters by name)
- Sorting works on all sortable columns
- Clicking agent row navigates to detail page (can be placeholder still)
- Responsive on different screen widths
- No TypeScript errors

---

## Phase F3: Agent Detail + Monaco Editor

**Estimated time:** 25-35 min
**Dependencies:** Phase F2 complete

### Task Description

Build the Agent Detail page with a Monaco Editor for viewing/editing agent MD definitions, an execution history tab, and lifecycle action buttons.

### Requirements

1. **Install Monaco Editor:**
   - `@monaco-editor/react` package
   - Configure for Markdown syntax highlighting
   - Dark theme matching the app

2. **Agent Detail page (`AgentDetailPage.tsx`):**
   - **Header section:**
     - Agent name (large)
     - Status badge
     - Version number
     - Author + created date
     - Action buttons (context-dependent — see below)
   - **Tab navigation:**
     - Definition (Monaco editor)
     - Execution History
     - Versions
     - Settings

3. **Definition tab:**
   - **Monaco Editor** (80% of content area):
     - Read-only by default
     - "Edit" button toggles to edit mode (only for draft/approved status)
     - Markdown syntax highlighting
     - Line numbers
     - Minimap off (saves space)
     - Word wrap on
   - **Sidebar panel** (20%, right side):
     - Tools used (parsed from MD, shown as chips)
     - Schedule info (parsed from MD)
     - Constraints summary
     - Quick stats (execution count, avg duration, cost)
   - **Editor toolbar:**
     - Save (when editing)
     - Validate (calls validation logic)
     - Cancel edit
     - Format MD

4. **Execution History tab:**
   - Table of executions for this agent
   - Columns: ID (short), Trigger, Status, Duration, Tokens, Cost, Started
   - Click row → expand inline to show output + tool calls
   - "Run Now" button (manual trigger — just a placeholder action for now)

5. **Lifecycle action buttons** (shown in header based on current status):
   - **draft:** [Edit] [Submit for Review] [Delete]
   - **pending_review:** [Approve] [Reject] (with reason modal)
   - **approved:** [Activate] [Edit] (creates new version)
   - **active:** [Disable] [Run Now]
   - **disabled:** [Re-activate] [Edit]
   - Actions update the mock store immediately (optimistic)

6. **Validation panel (`ValidationPanel.tsx`):**
   - Shows below editor when "Validate" is clicked
   - Parses the MD content client-side
   - Checks: has required sections (Agent name, Description, Instructions, Tools, Schedule)
   - Checks: tools referenced exist in mock tool registry
   - Shows ✅ pass / ⚠️ warning / ❌ error for each check

7. **Mock agent definitions:**
   - Populate 2-3 mock agents with full MD content matching the schema from PLAN.md
   - Use the "Overdue Invoice Reminder" and "Case Triage Bot" examples

### Acceptance Criteria
- Navigating to `/agents/:id` shows full agent detail
- Monaco editor renders MD with syntax highlighting
- Edit mode toggle works (only available for appropriate statuses)
- Validation shows meaningful results when clicking Validate
- Lifecycle buttons show correctly per status and update state
- Execution history tab shows mock data in table
- Tab switching works smoothly
- Editor is responsive (doesn't break on resize)

---

## Phase F4: Builder — AI Chat Interface

**Estimated time:** 30-40 min
**Dependencies:** Phase F3 complete

### Task Description

Build the Builder page — the core feature. Split-panel layout with a chat interface on the left and the Monaco editor on the right. The chat simulates the AI builder experience (mock AI responses for now; real Claude API integration comes with the backend).

### Requirements

1. **Builder page layout (`BuilderPage.tsx`):**
   - **Split panel** — resizable divider (default 40/60 split):
     - Left: Chat panel
     - Right: Editor panel (Monaco) + validation + action buttons
   - Panels resize via drag handle
   - On mobile: stack vertically (chat on top, editor below)

2. **Chat panel (`BuilderChat.tsx`):**
   - **Message list:**
     - System welcome message: "Welcome to AgentForge Builder! Describe what you want your agent to do, and I'll create the definition for you."
     - User messages (right-aligned, amber background)
     - AI messages (left-aligned, dark background with subtle border)
     - AI messages show a "typing..." animation while "generating"
   - **Input area (`ChatInput.tsx`):**
     - Multi-line text input (auto-grows, max 4 lines)
     - Send button (arrow icon)
     - Send on Enter (Shift+Enter for newline)
     - Disabled while AI is "generating"
   - **Suggestion chips** (shown in welcome state):
     - "Check overdue invoices and notify Slack"
     - "Triage new Salesforce cases"
     - "Weekly sales performance report"
     - "Alert on expiring contracts"
     - Clicking a chip populates the input and auto-sends

3. **Mock AI builder responses:**
   Create a mock builder service (`src/mocks/builder.ts`) that:
   - Takes a user prompt
   - Waits 2-3 seconds (simulated generation time)
   - Returns a pre-built Agent MD definition based on keyword matching:
     - "invoice" → returns the Invoice Reminder agent MD
     - "case" or "triage" → returns the Case Triage Bot MD
     - "report" → returns a generic report agent MD
     - Anything else → returns a generic template with the user's description filled in
   - Also returns an `explanation` message: "I've created an agent that [summary]. You can review the definition on the right and make any changes."

4. **Chat → Editor sync:**
   - When the mock AI returns a definition, it appears in the Monaco editor
   - If user sends a follow-up message ("Also add email notification"), the mock service returns an updated MD and the editor updates
   - Editor changes do NOT sync back to chat (one-way: chat generates → editor displays)

5. **Editor panel** (reuse from Phase F3 but in edit mode by default):
   - Always editable in the builder
   - Validation panel visible below
   - Real-time validation as user types (debounced 500ms)

6. **Tool browser sidebar (`ToolBrowser.tsx`):**
   - Collapsible panel below the chat
   - Shows available tools as cards:
     - Icon, name, description, tier badge
     - Click to see more detail in a popover
   - Mock tools: salesforce_query, sf_record_update, slack_notify, email_send, google_sheets_read

7. **Action buttons (bottom of editor panel):**
   - [Save as Draft] → creates agent in store with status=draft, navigates to `/agents/:id`
   - [Validate] → runs validation
   - [Reset] → clears editor and chat

8. **Builder Zustand store (`src/stores/builderStore.ts`):**
   - State: `messages[]`, `currentDefinition`, `isGenerating`, `conversationId`
   - Actions: `sendMessage()`, `updateDefinition()`, `reset()`

### Acceptance Criteria
- Builder page shows split chat/editor layout
- Chat works: type message → see mock AI response after delay
- Suggestion chips work and auto-generate definitions
- Generated MD appears in Monaco editor
- Follow-up messages update the editor content
- Tool browser shows available tools
- Save as Draft creates agent and navigates to detail page
- Resizable panel divider works
- Loading/typing animation during generation
- Responsive layout

---

## Phase F5: Execution History + Simulation + Polish

**Estimated time:** 25-35 min
**Dependencies:** Phase F4 complete

### Task Description

Build the Executions page, execution detail view with timeline, simulation/dry-run panel, and final polish across the app.

### Requirements

1. **Executions page (`ExecutionsPage.tsx`):**
   - **Filter bar:**
     - Agent dropdown (filter by specific agent)
     - Status dropdown (All, Success, Failed, Timeout, Running)
     - Trigger type dropdown (All, Scheduled, Manual, Webhook)
     - Date range picker (last 24h, 7d, 30d, custom)
   - **Executions table:**
     - Columns: Agent Name, Trigger, Status (badge), Duration, LLM Calls, Tokens, Cost, Started At
     - Sortable by: Started At, Duration, Cost
     - Status badges: success=green, failed=red, timeout=amber, running=blue (pulse animation)
   - Click row → navigate to `/executions/:id`
   - Auto-refresh toggle (every 10s when enabled — simulated with mock data rotation)

2. **Execution detail page (`ExecutionDetailPage.tsx`):**
   - **Header:** Agent name, execution ID (short UUID), status badge, duration, cost
   - **Timeline view (`ExecutionTimeline.tsx`):**
     - Vertical timeline showing each step of execution:
       - 🟢 Started (timestamp)
       - 🔧 Tool Call: salesforce_query (input summary, duration, status)
       - 🔧 Tool Call: slack_notify (input summary, duration, status)
       - 🏁 Completed (timestamp, final status)
     - Each step expandable to show full input/output JSON
     - Failed steps highlighted in red with error message
   - **Output panel:**
     - Agent's final output (formatted JSON or text)
     - Collapsible raw JSON view
   - **Metadata panel (sidebar):**
     - Agent version used
     - Trigger type
     - LLM calls count
     - Total tokens (input + output)
     - Estimated cost
     - Guardrails applied (list)

3. **Simulation panel (in Builder page):**
   - New button in builder: [▶ Simulate]
   - Opens a modal/drawer:
     - **Mock input editor:** JSON editor for sample input_context
     - Pre-fills based on the agent's Inputs section from the MD
     - [Run Simulation] button
     - Shows simulated execution timeline (mock tool calls with fake responses)
     - "Simulation" badge to clearly distinguish from real execution
   - Mock simulation service returns a pre-built timeline after 2-3s delay

4. **Global polish:**
   - **Toast notifications** (react-hot-toast):
     - "Agent saved as draft" (success)
     - "Agent submitted for review" (success)
     - "Validation failed: missing Tools section" (error)
     - Use across all actions
   - **Loading states:**
     - Skeleton loaders on dashboard cards and tables while "loading"
     - Spinner on buttons during actions
   - **Empty states:**
     - No agents yet → "Create your first agent" with link to builder
     - No executions → "No executions yet. Activate an agent to see results here."
     - No search results → "No agents match your filters"
   - **Error boundary** (catches component errors, shows fallback UI)
   - **Keyboard shortcuts:**
     - `Ctrl+S` in editor → Save
     - `Ctrl+Enter` in builder chat → Send
     - `Escape` → Close modals
   - **Page titles** (document.title updates per page)
   - **Breadcrumbs** on detail pages: Dashboard > Agents > Invoice Reminder

5. **Zustand execution store (`src/stores/executionStore.ts`):**
   - State: `executions[]`, `isLoading`, `filters`
   - Actions: `fetchExecutions()`, `getExecutionById()`, `setFilter()`

### Acceptance Criteria
- Executions page shows filterable table of all mock executions
- Clicking execution shows detail page with timeline
- Timeline shows expandable steps with tool call details
- Simulation works in builder (modal → mock result → timeline)
- Toast notifications fire on all major actions
- Loading skeletons show while data "loads"
- Empty states display correctly
- Keyboard shortcuts work
- No console errors, no TypeScript errors
- Overall app feels polished and cohesive

---

## Running Each Phase

For each phase, the Claude Code command pattern is:

```powershell
cd C:\code\agent-platform; claude --permission-mode bypassPermissions --print "Read PLAN.md and FRONTEND_PHASES.md. Execute Phase F[N] from FRONTEND_PHASES.md. [Phase F(N-1) is already complete if N>1.] Do NOT ask questions — make decisions and build. After creating all files, run 'npm run dev' to verify the app starts without errors. Fix any errors before finishing."
```

Or for background execution:
```powershell
cd C:\code\agent-platform; claude --permission-mode bypassPermissions --print "..." > claude-output.log 2>&1
```
