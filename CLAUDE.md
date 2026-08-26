# to-do-app

## Agent skills

### Issue tracker

Issues and PRDs live in Linear (project **To-do App**, team Eng), managed via the `linear-server` MCP tools. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — the five canonical roles used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.

### Delivery

Ticket work uses worktrees at `worktrees/<slug>` off `main` and ends with an explicitly linked PR and Human Review. Merging is the release: Vercel builds every push to `main`, running Drizzle migrations before the app build so code and schema ship atomically. `docs/agents/delivery.md` carries this repo's facts.
