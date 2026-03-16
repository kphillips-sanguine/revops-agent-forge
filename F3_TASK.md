Read PLAN.md and FRONTEND_PHASES.md in this directory. Execute Phase F3 from FRONTEND_PHASES.md.

Phases F1 and F2 are already complete — the React scaffold, app shell, routing, types, stores, dashboard, agent list, mock data, and status badges are all built in `agent-platform-ui/`.

Build on top of the existing code. Do NOT re-scaffold or overwrite existing files unless you need to modify them.

Do NOT ask questions — make decisions and build. Be thorough and complete.

Key requirements for F3:
- Install and configure @monaco-editor/react for the Agent Detail page
- Build the full Agent Detail page with tabs (Definition, Execution History, Versions, Settings)
- Monaco editor with Markdown syntax highlighting, dark theme, edit mode toggle
- Lifecycle action buttons that change based on agent status
- Client-side MD validation panel
- Populate 2-3 mock agents with full MD content (use the Invoice Reminder and Case Triage Bot examples from PLAN.md)

After creating all files, run `npm run build` to verify zero errors. Fix any errors before finishing.

When completely finished and verified working, run this exact command:
```
openclaw system event --text "F3 Complete: Agent detail page, Monaco editor, MD validation, lifecycle buttons, execution history tab all built. npm run build verified clean." --mode now
```
