# ADR 0001: PGlite for local development and tests

Date: 2026-07-30
Status: accepted
Issue: VETTA-751

## Context

Production persistence is moving from better-sqlite3 to Postgres (Neon) for the
Vercel deployment (VETTA-753). That opens the question of what `pnpm dev`, the
Vitest suites, and the Playwright run use locally. Candidates: a Docker Compose
Postgres, a per-developer Neon branch over the network, or embedded PGlite.
better-sqlite3 had set a high bar for DX: zero setup, no daemon, in-memory
databases per test.

## Decision

Local development and tests run on **PGlite** (`@electric-sql/pglite` via
`drizzle-orm/pglite`): in-memory per test, file-backed under `apps/api/.data`
for `pnpm dev`. The same Drizzle schema and migrations serve both drivers;
production uses `pg` + `drizzle-orm/node-postgres` against Neon's pooled URL,
per the VETTA-750 research notes (landing as `docs/research/neon-serverless.md`
via PR #18).

## Consequences

- Dev DX is unchanged from the sqlite days: no Docker, no network, works in CI.
- PGlite is real Postgres compiled to WASM, so dialect parity is close but not
  guaranteed identical to Neon; the accepted mitigation is the live smoke check
  against real Neon after each production deploy (VETTA-755).
- Tests migrate the schema on every `createPgliteDb()`, so migrations stay
  continuously exercised.
