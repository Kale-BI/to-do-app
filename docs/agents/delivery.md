# Delivery

Repo facts for the delivery skills: `implement` reads the repository mapping and additions; `merge-and-deploy` reads Close out. The standard behaviour lives in those skills; this file carries only repo facts and repo-specific additions.

## Repository mapping

- **Base branch:** `main`
- **Worktree location:** `worktrees/<slug>` at the repo root
- **Being worked:** Linear state **In Progress**
- **Human review:** Linear state **Human Review**
- **Pull-request linking:** start the pull-request title with the Linear identifier and attach its URL to the Linear issue explicitly
- **Pull-request environment:** none needed — Vercel builds a preview deployment for every pull request automatically. Note that previews migrate the **shared dev Neon branch**, so two open pull requests with conflicting migrations will race; that is accepted at this team size (ADR 0002).
- **Long-form home:** the feature's dossier in [Kale-BI/dossiers](https://github.com/Kale-BI/dossiers), served at [dossiers.eatkale.ai](https://dossiers.eatkale.ai) — that repo's `AGENTS.md` carries the writing contract

## Repo-specific additions

**Checks:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm e2e`. CI runs the first three on every pull request.

**Migrations are forward-only and additive-first.** The runtime `createDb` never migrates (ADR 0001); schema changes ship through `drizzle-kit` in the build step (ADR 0002). Write migrations that an older running deployment can tolerate, because code and schema go live together but a rollback undoes only the code.

## Close out

- **Merge method:** squash
- **Remote branch:** leave
- **Deploy:** none — the merge is the release. Vercel builds every push to `main` on its own git trigger, and the build command runs `pnpm --filter @todo/api run db:migrate` against `DATABASE_URL_UNPOOLED` before `vite build`, so a failed migration fails the deploy and code and schema ship atomically (ADR 0002).
- **Deploy green:** the Vercel deployment for the merge commit reaches **Ready**. A build that fails on the migration step never serves, so a green build is also proof the schema moved.
- **Canary:** none recorded — exercise what the ticket changed, in production. **The production URL is not written down anywhere in this repo**; find it in the Vercel project and add it to this line the first time close-out runs here.
- **Local cleanup:** remove the ticket worktree, delete the local branch, fast-forward `main`
- **Shipping state:** Linear state **Ship**
- **Blocked:** Linear state **Blocked**

**Rolling back does not roll back the schema.** Reverting a deployment restores the code and leaves the migration applied. Fix forward; a revert is a human's call, and a schema-shaped problem needs a new additive migration rather than a rollback.
