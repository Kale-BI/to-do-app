# ADR 0002: Drizzle migrations run in the Vercel build step

Date: 2026-07-30
Status: accepted
Issue: VETTA-752

## Context

Neon's schema has to be migrated by something outside the request path: the
runtime `createDb` deliberately never migrates (ADR 0001 keeps startup
migrations a PGlite dev/test concern). Candidates: the Vercel build step, a
GitHub Action on main, or manual `drizzle-kit` runs. Neon's docs require
migrations to use the direct (unpooled) connection string, not PgBouncer.

## Decision

The Vercel build command runs `drizzle-kit migrate` (via
`pnpm --filter @todo/api run db:migrate`) before `vite build`, against
`DATABASE_URL_UNPOOLED`. A failed migration fails the deploy, so code and
schema ship atomically; there is no ordering gap between a CI job and
Vercel's own git-triggered deploy.

## Consequences

- `DATABASE_URL_UNPOOLED` must be available to the build environment (synced
  from Doppler, per the VETTA-748 provisioning), not just to the function
  runtime.
- Preview deploys migrate the shared dev Neon branch; concurrent previews with
  conflicting migrations would race, which is accepted at this team size.
- Rolling back a deploy does not roll back the schema — migrations stay
  forward-only, additive-first.
