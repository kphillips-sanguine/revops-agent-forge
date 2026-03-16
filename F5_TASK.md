Read PLAN.md and FRONTEND_PHASES.md in this directory. Execute Phase F5 from FRONTEND_PHASES.md.

Phases F1 through F4 are already complete in `agent-platform-ui/`. The full scaffold, dashboard, agent list, agent detail with Monaco editor, and the Builder chat interface are all built.

Build on top of the existing code. Do NOT re-scaffold or overwrite existing files unless you need to modify them.

Do NOT ask questions — make decisions and build. Be thorough and complete.

Key requirements for F5:
1. Executions page with filterable table (agent dropdown, status, trigger type, date range)
2. Execution detail page with vertical timeline showing each step (start, tool calls, completion)
3. Expandable timeline steps showing full input/output JSON
4. Simulation panel in Builder page (modal/drawer with mock input editor, simulated timeline)
5. Toast notifications using react-hot-toast across all major actions
6. Loading skeleton states on dashboard and tables
7. Empty states (no agents, no executions, no search results)
8. Error boundary component
9. Keyboard shortcuts (Ctrl+S save, Ctrl+Enter send, Escape close modals)
10. Page titles (document.title per page)
11. Breadcrumbs on detail pages
12. Zustand execution store

Install react-hot-toast if not already present.

After creating all files, run `npm run build` to verify zero errors. Fix any errors before finishing.

When completely finished and verified working, run this exact command:
```
openclaw system event --text "F5 Complete: Executions page, execution detail with timeline, simulation, toasts, loading states, empty states, keyboard shortcuts, polish all done. npm run build verified clean." --mode now
```
