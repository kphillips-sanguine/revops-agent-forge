Read PLAN.md and BACKEND_PHASES.md in this directory. Execute Phase B3 from BACKEND_PHASES.md.

Phases B1 and B2 are complete in `agent-platform-api/`. The FastAPI scaffold, models, schemas, agent CRUD with lifecycle state machine, tool registry, and audit logging are all implemented.

Build on top of the existing code. Do NOT re-create existing files unless modifying them.

Do NOT ask questions — make decisions and build.

Key requirements:
1. Real JWT auth service (login with email/password, for dev accept any password for seeded users)
2. Auth router: POST /api/auth/login, GET /api/auth/me
3. Update dependencies.py so get_current_user validates JWT tokens and looks up user from DB
4. CORS allowing http://localhost:5173

5. Update the FRONTEND code in agent-platform-ui/:
   - Update src/api/client.ts to attach JWT from localStorage
   - Create src/api/agents.ts, src/api/executions.ts, src/api/tools.ts, src/api/auth.ts with real API functions
   - Update authStore.ts for real login/logout with JWT
   - Update agentStore.ts to fetch from API (with mock data fallback)
   - Update executionStore.ts to fetch from API
   - Add a simple LoginPage.tsx with email/password form
   - Add route protection (redirect to /login if not authenticated)
   - Update App.tsx with login route

6. Verify both frontend and backend:
   - Backend: cd agent-platform-api && python -m uvicorn app.main:app --port 8000
   - Frontend: cd agent-platform-ui && npm run build (zero TS errors)

When completely finished and verified working, run this exact command:
```
openclaw system event --text "B3 Complete: JWT auth, frontend API wiring, login page, protected routes, real API integration with mock fallback. Both frontend and backend verified." --mode now
```
