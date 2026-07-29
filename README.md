# to-do-app

A multi-user to-do app — and a testbed for an agent-driven engineering workflow.

## Layout

pnpm workspace:

- `apps/web` — Vite + React + shadcn/ui frontend
- `apps/api` — Hono API
- `packages/shared` — Zod schemas shared by both

## Prerequisites

- Node 22 (see `.nvmrc`)
- pnpm 11 (via `corepack enable pnpm`)

## Commands

From the repo root:

```sh
pnpm install        # install all packages
pnpm dev            # start web (http://localhost:5180) and api (http://localhost:3000)
pnpm test           # run all Vitest suites
pnpm typecheck      # typecheck all packages
pnpm lint           # lint the repo
pnpm e2e            # run the Playwright smoke suite (boots both servers itself)
```

First E2E run needs a browser: `pnpm --filter @todo/web exec playwright install chromium`.
