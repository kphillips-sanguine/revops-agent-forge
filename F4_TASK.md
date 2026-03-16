Read PLAN.md and FRONTEND_PHASES.md in this directory. Execute Phase F4 from FRONTEND_PHASES.md.

Phases F1, F2, and F3 are already complete in `agent-platform-ui/`. The scaffold, dashboard, agent list, agent detail page with Monaco editor, validation, lifecycle buttons, and mock data are all built.

Build on top of the existing code. Do NOT re-scaffold or overwrite existing files unless you need to modify them.

Do NOT ask questions — make decisions and build. Be thorough and complete.

Key requirements for F4:
- Split-panel Builder page: chat on left (40%), Monaco editor on right (60%), resizable divider
- Chat interface with message list, multi-line input (Enter to send, Shift+Enter newline), typing animation
- Suggestion chips in welcome state ("Check overdue invoices and notify Slack", etc.)
- Mock AI builder service that keyword-matches prompts to return pre-built Agent MD definitions (use existing mock agents)
- Chat-to-editor sync: generated MD appears in editor, follow-up messages update it
- Tool browser sidebar (collapsible, below chat) showing available tools with tier badges
- Action buttons: Save as Draft (creates agent in store, navigates to detail), Validate, Reset
- Builder Zustand store for chat state

After creating all files, run `npm run build` to verify zero errors. Fix any errors before finishing.

When completely finished and verified working, run this exact command:
```
openclaw system event --text "F4 Complete: Builder page with chat, Monaco editor, mock AI generation, tool browser, suggestion chips all built. npm run build verified clean." --mode now
```
