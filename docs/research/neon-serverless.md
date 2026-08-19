# Research: Neon + Drizzle + better-auth on Vercel serverless (VETTA-750)

Question: what driver/pooling/adapter stack should the API use to talk to Neon Postgres
from Vercel Functions, and what does better-auth need for it?

All claims below were verified against primary sources (Neon, Drizzle, better-auth,
Vercel docs; npm registry) on 2026-07-30. Unverifiable claims are flagged as such.

## Bottom line

- **Simplest, lowest latency:** `@neondatabase/serverless` HTTP driver (`neon()`) +
  `drizzle-orm/neon-http` + `drizzleAdapter(db, { provider: "pg" })`. One-shot queries
  over fetch (~3 round trips vs ~8 for TCP), no connection lifecycle to manage, batched
  non-interactive transactions available. Caveat: no interactive transactions; whether
  better-auth's Drizzle adapter ever needs `db.transaction()` is not documented either
  way (see §4).
- **Safest all-rounder:** plain `pg` `Pool` + `drizzle-orm/node-postgres` against the
  **pooled** `DATABASE_URL` (`-pooler`, PgBouncer transaction mode), or
  `@neondatabase/serverless` WebSocket `Pool` + `drizzle-orm/neon-serverless` (needs
  `ws` in Node; Pool must be created/used/closed within one request handler).
- Either way: better-auth provider is `"pg"`; schema comes from `npx auth@latest
  generate` then drizzle-kit (better-auth's `migrate` command is Kysely-only); run
  drizzle-kit migrations against `DATABASE_URL_UNPOOLED`.

## 1. `@neondatabase/serverless`: HTTP vs WebSocket

Source: <https://neon.com/docs/serverless/serverless-driver>,
<https://neon.com/docs/connect/choose-connection>

- **HTTP driver (`neon()`):** queries run as fetch requests; "faster for single,
  non-interactive transactions" ("one-shot queries"). ~3 round trips per query vs ~8
  for TCP. Max request/response size 64 MB. No interactive sessions or interactive
  transactions.
- **Batched transactions over HTTP work:** `neon(...).transaction([...])` executes
  multiple queries in a single non-interactive transaction — queries cannot depend on
  each other's results.
- **WebSocket driver (`Pool`/`Client`):** node-postgres-compatible drop-in with full
  session and interactive-transaction support.
- **Neon's serverless rule for the WebSocket driver:** "Pool or Client objects must be
  connected, used and closed within a single request handler." Never at module scope.
  The HTTP `neon()` client is stateless per query, so module scope is fine.

## 2. Plain `pg` over Neon's pooled connection string

Source: <https://neon.com/docs/connect/connection-pooling>,
<https://neon.com/docs/connect/choose-connection>

- Pooled string = `-pooler` in the endpoint hostname; routes through PgBouncer in
  **transaction mode**. Neon recommends it for serverless functions and
  connection-per-request workloads; plain TCP drivers suit long-lived servers.
- Transaction-mode caveats: no `SET`/`RESET` session vars, `LISTEN`/`NOTIFY`,
  SQL-level `PREPARE`, temp tables, or session advisory locks. **Protocol-level
  prepared statements (what `pg` and Drizzle use) are supported.**
- Use the **direct (unpooled)** string for migrations, `pg_dump`, logical replication,
  `CREATE INDEX CONCURRENTLY`.
- Limits: PgBouncer accepts up to 10,000 client connections; `default_pool_size` is
  90% of `max_connections` (compute-size dependent, e.g. 419 at 1 CU).

## 3. Matching Drizzle driver imports

Source: <https://orm.drizzle.team/docs/connect-neon>,
<https://orm.drizzle.team/docs/batch-api>

| Driver choice | Import | Init |
|---|---|---|
| Neon HTTP | `drizzle-orm/neon-http` | `drizzle(process.env.DATABASE_URL)` or `drizzle({ client: neon(url) })` |
| Neon WebSocket | `drizzle-orm/neon-serverless` | `drizzle(url)` or `drizzle({ client: new Pool({ connectionString }) })`; Node needs `ws` (+ `bufferutil`) |
| node-postgres | `drizzle-orm/node-postgres` | `drizzle({ client: new Pool({ connectionString }) })` |

- Drizzle echoes the neon-http limitation: no session / interactive transaction
  support. (Not verified: an explicit statement that `db.transaction()` throws on
  neon-http — docs frame it as a driver capability gap, not a documented throw.)
- The batch API is supported with the Neon HTTP driver — Drizzle's only Postgres
  batch driver.

## 4. better-auth Drizzle adapter and CLI

Source: <https://www.better-auth.com/docs/adapters/drizzle>,
<https://www.better-auth.com/docs/concepts/cli>,
<https://www.better-auth.com/docs/adapters/postgresql>, npm registry

- Adapter config: `drizzleAdapter(db, { provider: "pg" })`. Options: `provider`
  (`"sqlite" | "pg" | "mysql"`), `schema` (map model names to tables, e.g.
  `{ ...schema, user: schema.users }`), `usePlural`.
- CLI is now `npx auth@latest generate` (npm: `auth@1.6.25` is "The CLI for Better
  Auth"; the older `@better-auth/cli` still exists at 1.4.21). For Drizzle, generate
  writes `schema.ts` in the project root.
- **`migrate` is Kysely-only** (verified verbatim): "This is available if you're using
  the built-in Kysely adapter. For other adapters, you'll need to apply the schema
  using your ORM's migration tool." With Drizzle: `generate` → `drizzle-kit generate`
  → migrate/push.
- **sqlite → pg migration for our code** (`apps/api/src/auth.ts` currently has
  `provider: "sqlite"`): change the provider to `"pg"` and re-run generate so the
  schema matches. The docs say generate produces "the right schema for your ORM"; that
  the output switches to `pg-core` column types is implied but not stated verbatim.
- Nothing Neon/serverless-specific documented — better-auth just consumes the `db`
  instance; driver choice is ours. Not documented either way: whether the adapter
  internally calls `db.transaction()` (which would rule out neon-http). The WebSocket
  or pg-over-pooler stacks avoid that question entirely.

## 5. Serverless connection guidance

Source: <https://neon.com/docs/connect/connection-pooling>,
<https://neon.com/docs/serverless/serverless-driver>,
<https://vercel.com/docs/fluid-compute>

- Neon: pooled connections are essential for serverless because each invocation may
  open a connection; direct-connection limits exhaust quickly.
- Neon WebSocket `Pool`/`Client`: create, use, and close inside one request handler
  (see §1). HTTP `neon()`: module scope is fine.
- Vercel Fluid compute (default for new projects since 2025-04-23): multiple
  invocations share a function instance, so module-scope state persists on warm
  instances. The Fluid docs contain no explicit database-connection guidance —
  "keep a `pg` Pool at module scope under Fluid" is a reasonable inference from
  shared-instance concurrency, not a quoted Vercel claim.

## 6. Env vars injected by the Vercel Neon marketplace integration

Source: <https://neon.com/docs/guides/vercel-managed-integration> (referenced also by
the vercel-native-integration and transition-guide pages)

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Pooled connection string (PgBouncer) |
| `DATABASE_URL_UNPOOLED` | Direct connection string |
| `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE`, `PGPASSWORD` | Raw pieces for custom strings |
| `POSTGRES_*` | Backwards compatibility with Vercel Postgres templates (not individually enumerated in current docs) |
| `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL` | Managed Better Auth endpoints (when Neon Auth is enabled) |

Not currently documented (historical only): itemized `POSTGRES_URL`,
`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NO_SSL`, and the
Stack-Auth-era `NEXT_PUBLIC_STACK_*` variables.

## Sources

- <https://neon.com/docs/serverless/serverless-driver>
- <https://neon.com/docs/connect/connection-pooling>
- <https://neon.com/docs/connect/choose-connection>
- <https://orm.drizzle.team/docs/connect-neon>
- <https://orm.drizzle.team/docs/batch-api>
- <https://www.better-auth.com/docs/adapters/drizzle>
- <https://www.better-auth.com/docs/concepts/cli>
- <https://www.better-auth.com/docs/adapters/postgresql>
- <https://vercel.com/docs/fluid-compute>
- <https://neon.com/docs/guides/vercel-managed-integration>
- npm registry (`auth`, `@better-auth/cli`)
