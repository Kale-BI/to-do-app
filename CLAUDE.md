# to-do-app

## Agent skills

### Issue tracker

Issues live in Linear, project "To-do App" (Engineering team, identifiers `ENG-<n>`). See `docs/agents/issue-tracker.md`.

### Artefact

Artefacts are pages in Kale-BI/dossiers, served at dossiers.eatkale.ai. See `docs/agents/artefact.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.

### Delivery

Read by `ship`.

- **Base branch:** `main`
- **Merge:** squash; remote branch left
- **Deploy:** none, the merge is the release — Vercel builds every push to `main` on its own git trigger, running `pnpm --filter @todo/api run db:migrate` against `DATABASE_URL_UNPOOLED` before `vite build`, so code and schema ship atomically (ADR 0002).
- **Deploy green:** the Vercel deployment for the merge commit reaches **Ready**. A build that fails on the migration step never serves, so a green build is also proof the schema moved.
- **Canary:** exercise what the ticket changed, in production. `<blank: the production URL is recorded nowhere in this repo — find it in the Vercel project and write it here the first time close-out runs>`
- **Local cleanup:** remove the ticket worktree, delete the local branch, fast-forward `main`

**Rolling back does not roll back the schema.** Migrations are forward-only and additive-first: reverting a deployment restores the code and leaves the migration applied, so a schema-shaped problem needs a new additive migration rather than a rollback.

**Preview deploys migrate the shared dev Neon branch**, so two open pull requests with conflicting migrations race; accepted at this team size (ADR 0002).
