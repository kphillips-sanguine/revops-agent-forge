Read PLAN.md and BACKEND_PHASES.md in this directory. Execute Phase B5 from BACKEND_PHASES.md.

Phases B1-B4 are complete in `agent-platform-api/`. The full backend is built: FastAPI, models, auth, agent CRUD, lifecycle, tool registry, agent runtime with executor, MD parser, guardrails, tool implementations.

Build on top of the existing code. Do NOT re-create existing files unless modifying them.

Do NOT ask questions — make decisions and build.

Key requirements:
1. Builder service (app/services/builder_service.py):
   - generate_agent(prompt, conversation_history, current_definition, available_tools) → returns definition_md, explanation, tools_used, warnings, suggestions
   - Calls Anthropic API (claude-sonnet-4-20250514) with system prompt containing the Agent MD schema from PLAN.md section 3.1
   - Includes available tools from tool_registry in context
   - For refinement: includes current_definition so Claude can modify it
   - Auto-validates the produced MD and includes warnings in response

2. Simulation service (app/services/simulation_service.py):
   - simulate_agent(definition_md, mock_inputs) → SimulationResult
   - Runs the executor but with MockTool instances that return realistic sample data
   - Returns execution timeline for UI display

3. Builder router (app/routers/builder.py) — implement all 3 endpoints:
   - POST /api/builder/generate — generate/refine agent definition
   - POST /api/builder/validate — validate MD (already done in B4, verify it works)
   - POST /api/builder/simulate — dry-run with mock data

4. Update frontend (agent-platform-ui/):
   - Create src/api/builder.ts with real API functions
   - Update src/stores/builderStore.ts to call real /api/builder/generate instead of mock
   - Update BuilderPage.tsx simulation to call real /api/builder/simulate
   - Keep mock fallback if API unavailable
   - Run npm run build to verify zero TS errors

After implementing, verify backend starts: cd agent-platform-api && python -m uvicorn app.main:app --port 8000

When completely finished and verified working, run this exact command:
```
openclaw system event --text "B5 Complete: Builder AI with Claude API, simulation service, frontend wired to real builder API. Both verified." --mode now
```
