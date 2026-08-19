# Research: Hono API under /api + static Vite SPA on one Vercel project (VETTA-749)

Question: what is the current, documented way to serve our Hono app as Vercel Functions
under `/api` alongside the static Vite SPA build, from a single Vercel project rooted in
a pnpm monorepo?

All claims below were verified against primary sources (Vercel docs, Hono docs,
honojs/hono source on GitHub) on 2026-07-30. Unverifiable claims are flagged as such.

## Bottom line

- **Runtime: Node.js.** Vercel's Edge runtime page now opens with "We recommend
  migrating from edge to Node.js for improved performance and reliability." Edge has no
  filesystem, no native Node APIs (only `async_hooks`/`events`/`buffer`/`assert`/`util`),
  which rules out `pg` and most of better-auth's Node path. Node.js is the default
  runtime for `api/` functions, runs on Fluid compute, and supports "all Node.js APIs."
- **Layout:** keep the Vite SPA as the framework build (Root Directory `apps/web`,
  Vite preset, output `dist`), and add one catch-all function entry `api/index.ts`
  inside that Root Directory that imports the Hono app and exports it in the
  `fetch` Web Standard shape. One file in `api/` = one Vercel Function.
- **Entry code:** do NOT call `@hono/node-server`'s `serve()`. Export the app:
  `export default app` (a Hono instance is exactly the documented
  `export default { fetch(request) {...} }` shape), or wrap with
  `handle` from `hono/vercel` (`handle = (app) => (req) => app.fetch(req)`).
- **vercel.json:** two rewrites — route `/api/(.*)` to the single function, then the
  documented SPA fallback to `/index.html` (with `/api` excluded via regex negation):

  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api" },
      { "source": "/((?!api/).*)", "destination": "/index.html" }
    ]
  }
  ```

- **Monorepo:** one Vercel project, Root Directory `apps/web`; keep "Include source
  files outside of the Root Directory in the Build Step" enabled (default since
  2020-08-27) so the function can bundle `@todo/shared` and `apps/api` sources. pnpm is
  auto-detected from `pnpm-lock.yaml` at the repository root (`lockfileVersion: 9.0` →
  pnpm 9/10); to pin the exact version, set `ENABLE_EXPERIMENTAL_COREPACK=1` +
  `packageManager` in the root `package.json`.
- **Watch out:** Vercel also ships a first-class "Services" model (multiple
  backends/frontends in one project via `services` + rewrites in `vercel.json`), which
  is the cleanest fit on paper — but it is permission-gated ("Permissions Required:
  Services"), so the `api/` directory approach is the one that works everywhere today.

## 1. `hono/vercel` adapter: exports and current usage

Source: <https://hono.dev/docs/getting-started/vercel>,
<https://github.com/honojs/hono/blob/main/src/adapter/vercel/index.ts>,
<https://github.com/honojs/hono/blob/main/src/adapter/vercel/handler.ts>,
<https://vercel.com/docs/frameworks/backend/hono>

- The adapter (`hono/vercel`) exports exactly two things: `handle` and `getConnInfo`.
  `handle` is trivial:

  ```ts
  export const handle = (app: Hono<any, any, any>) =>
    (req: Request): Response | Promise<Response> => {
      return app.fetch(req)
    }
  ```

- **Hono's current Vercel docs no longer show `handle` at all.** The page documents
  zero-config deployment: export the Hono app as the default export from `index.ts` /
  `src/index.ts` (`export default app`) and deploy. The adapter still exists and works,
  but the documented happy path is the plain default export.
- Vercel's Hono framework page confirms the export contract for a Hono-preset project:
  create a file at `app|index|server.{js,ts,...}` or `src/` equivalents with
  `export default app`; "your server routes automatically become Vercel Functions and
  use Fluid compute by default."
- Runtime: neither hono.dev nor Vercel's Hono page mentions the Edge runtime for this
  path anymore; functions default to the Node.js runtime (see §2). Given better-auth +
  `pg` (TCP Postgres), Node is the only viable runtime (see §2).

## 2. Node vs Edge runtime

Source: <https://vercel.com/docs/functions/runtimes>,
<https://vercel.com/docs/functions/runtimes/node-js>,
<https://vercel.com/docs/functions/runtimes/edge>,
<https://vercel.com/docs/functions/functions-api-reference>

- Edge runtime page, first note: "We recommend migrating from edge to Node.js for
  improved performance and reliability. Both runtimes run on Fluid compute with Active
  CPU pricing."
- Edge restrictions (verbatim): "Some Node.js APIs other than the ones listed above
  are not supported. For example, you can't read or write to the filesystem";
  "`node_modules` *can* be used, as long as they implement ES Modules and do not use
  native Node.js APIs." The compatible-module list is only `async_hooks`, `events`,
  `buffer`, `assert`, `util`. `net`/`tls` (which `pg` needs for TCP) are not on the
  list — so `pg` on Edge is ruled out by omission (the docs never name `pg`
  specifically; that mapping is an inference).
- Node.js runtime: "The Node.js runtime offers access to all Node.js APIs"; functions
  get a "read-only filesystem with writable `/tmp` scratch space up to 500 MB"
  (runtimes page). The `config` object's `runtime` "if not set ... will default to
  `nodejs`" (Functions API reference). So: no config needed — just don't set
  `runtime: 'edge'`.
- Fluid compute is default for new projects (since 2025-04-23) and gives instance
  reuse/optimized concurrency — relevant to keeping a `pg` Pool at module scope (see
  the Neon research doc, VETTA-750).

## 3. Function entry layout for a non-Next.js project

Source: <https://vercel.com/docs/functions/functions-api-reference>,
<https://vercel.com/docs/project-configuration/vercel-json#functions>,
<https://vercel.com/docs/functions/runtimes/node-js>,
<https://vercel.com/kb/guide/using-express-with-vercel>,
<https://vercel.com/docs/functions/runtimes#functions-created-per-deployment>

- "You can create a function in other frameworks or with no frameworks by defining
  your function in a file under `/api` in your project. Vercel will deploy any file in
  the `/api` directory as a function." And from vercel.json docs: "the only
  requirement is to create an `api` directory at the root of your project directory,
  placing your Vercel functions inside." "Root of your project" = the configured Root
  Directory, i.e. `apps/web/api/` for us.
- **Accepted export shapes** in `api/` files (Functions API reference):
  - the `fetch` Web Standard export — "used by many frameworks like Hono, ElysiaJS,
    H3 ... allows you to handle all HTTP methods inside a single function":

    ```ts
    export default {
      fetch(request: Request) { ... },
    };
    ```

  - per-method exports (`export function GET(request: Request)`, etc.);
  - the legacy Node `(req, res)` handler with `@vercel/node` helpers.

  A Hono instance is an object with a `.fetch(request)` method, so `export default
  app` satisfies the fetch-standard shape — and it is literally what Vercel's own Hono
  docs prescribe for entry files. (That `export default app` inside `api/` under a
  *Vite* preset behaves identically is structurally implied, not stated verbatim; the
  belt-and-braces form is `export default { fetch: (req: Request) => app.fetch(req) }`
  or `export default handle(app)`.)
- **One function, all routes:** Vercel's own Express guide uses exactly this pattern —
  a single `api/index.ts` exporting the app, plus a rewrite sending traffic to `/api`.
  The function receives the *original* request path (rewrites are internal), so the
  Hono app must route with the `/api` prefix (e.g. `app.basePath('/api')` or routes
  registered as `/api/...`). The Express guide demonstrates the original-path behavior
  (its `app.get("/")` answers the root URL through the `/(.*) → /api` rewrite); the
  exact statement "functions see the pre-rewrite path" is not written verbatim in the
  docs.
- Function count matters on Hobby: "every API maps directly to one Vercel Function.
  For example, having five files inside `api/` would create five Vercel Functions. For
  Hobby, this approach is limited to 12 Vercel Functions per deployment." A single
  catch-all `api/index.ts` keeps us at 1.
- **Alternative A — Hono framework preset** (whole project = Hono): static assets must
  live in `public/**`; "Hono's `serveStatic()` will be ignored and will not serve
  static assets." Nothing documents pointing the preset's static side at a Vite build
  output, and there is no SPA-fallback story on that page — not a fit for our SPA.
- **Alternative B — Services** (<https://vercel.com/docs/services>): "Services let
  you deploy multiple backends and frontends within a single Vercel project," declared
  in `vercel.json`:

  ```json
  {
    "services": {
      "my_frontend": { "root": "frontend/" },
      "my_backend": { "root": "backend/", "entrypoint": "main:app" }
    },
    "rewrites": [
      { "source": "/api/(.*)", "destination": { "service": "my_backend" } },
      { "source": "/(.*)", "destination": { "service": "my_frontend" } }
    ]
  }
  ```

  This maps 1:1 onto `apps/web` + `apps/api` — but the page is marked
  "🔒 Permissions Required: Services", i.e. gated feature enablement. Also note the
  Node runtime page: "To deploy a Node.js server alongside a frontend such as a
  Next.js app within the same project, use Services." Worth revisiting once/if the
  team has access; not the baseline plan.

## 4. `vercel.json`: SPA fallback + `/api` routing

Source: <https://vercel.com/docs/project-configuration/vercel-json>
(rewrites, outputDirectory, buildCommand, functions sections)

- Documented SPA fallback: "This example rewrites all requests to the root path which
  is often used for a Single Page Application (SPA)":

  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```

- Rewrites run *after* the filesystem: "The `source` property should NOT be a file
  because precedence is given to the filesystem prior to rewrites being applied," and
  the deprecated `handle: filesystem` route type says to "use `rewrites` instead,
  which checks the filesystem by default." The `cleanUrls` section shows functions
  being served at their path like files ("a Vercel Function named `api/user.go` will
  be served when visiting `/api/user`"), which implies the bare `/(.*)` fallback would
  not shadow `/api/*` — but "functions win over catch-all rewrites" is never stated
  verbatim, so the safe, fully-documented config excludes `/api` explicitly with regex
  negation (negative-lookahead sources like `/:path((?!uk/).*)` appear in the docs'
  own examples):

  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api" },
      { "source": "/((?!api/).*)", "destination": "/index.html" }
    ]
  }
  ```

- `outputDirectory` / `buildCommand` / `installCommand` in `vercel.json` override the
  dashboard settings per deployment. With Root Directory `apps/web` and the Vite
  preset auto-detected, none of the three should be needed (Vite's `dist` output is
  auto-configured; "If Vercel detects a framework, the output directory will
  automatically be configured").
- Optional `functions` block for the API entry (`maxDuration`, `includeFiles`,
  `supportsCancellation`); with Fluid compute, memory is set in the dashboard, not in
  `vercel.json`:

  ```json
  { "functions": { "api/index.ts": { "maxDuration": 30 } } }
  ```

- `vercel.json` lives at the project root — with a Root Directory set, that means
  `apps/web/vercel.json` (the file "should be created in your project's root
  directory"; the Root Directory docs say the app "will not be able to access files
  outside of that directory", so the repo root is not scanned for it — the
  "project root = Root Directory" reading is consistent but not spelled out verbatim).

## 5. Monorepo + pnpm workspace settings

Source: <https://vercel.com/docs/monorepos>,
<https://vercel.com/docs/monorepos/monorepo-faq>,
<https://vercel.com/docs/builds/configure-a-build>,
<https://vercel.com/docs/package-managers>

- **Root Directory:** set per project in Settings → Build and Deployment ("specify the
  directory within your monorepo that you want to deploy"). For us: `apps/web`.
  Caveat: "Your app will not be able to access files outside of that directory. You
  also cannot use `..` to move up a level" — *unless* the monorepo escape hatch below
  is on.
- **Shared packages:** Monorepos FAQ, verbatim: "To access source files outside the
  Root Directory, enable the **Include source files outside of the Root Directory in
  the Build Step** option in the Root Directory section within the project settings.
  ... Vercel projects created after August 27th 2020 23:50 UTC have this option
  enabled by default." This is what lets `apps/web/api/index.ts` import
  `@todo/shared` and the `apps/api` app factory across the workspace.
- **Package manager detection:** "We automatically detect your package manager using
  the lockfile at the repository root" (monorepos page); pnpm version from
  `pnpm-lock.yaml`'s `lockfileVersion` (9.0 → "pnpm 9 or 10", 6.0/6.1 → pnpm 8, ...).
  "When no lock file exists, Vercel uses npm by default."
- **Corepack / `packageManager`:** "If you are using Corepack, Vercel will use the
  package manager specified in the `package.json` file's `packageManager` field
  instead." Enable by setting env var `ENABLE_EXPERIMENTAL_COREPACK=1` on the project,
  plus `"packageManager": "pnpm@x.y.z"` in the **root** `package.json`. Vercel's docs
  carry Node's warning that Corepack is experimental.
- **`installCommand`:** default is auto-detected `pnpm install`; "The install path is
  set by the root directory." Beware of overriding with a bare `pnpm install`: "Vercel
  will use the oldest version of the specified package manager available in the build
  container ... if you specify `pnpm install` as your override install command, Vercel
  will use pnpm 6." The monorepos page offers "Filtered installs" (custom Install
  Command installing only the deployed project + its workspace deps) as an
  optimization; not required. Whether the default install runs at the workspace root
  vs. inside `apps/web` when a Root Directory is set is not stated verbatim (pnpm
  itself resolves the workspace from `pnpm-workspace.yaml` regardless of cwd — pnpm
  behavior, not a Vercel claim).
- **Skipping unaffected projects** (build skipping) works automatically for
  GitHub-connected pnpm workspaces if: packages are in `pnpm-workspace.yaml`, every
  package has a unique `name`, and inter-package deps are explicit in each
  `package.json` — all true for this repo.
- Note the per-project function region default is `iad1`; co-locate with the Neon
  region per VETTA-750.

## 6. Gotchas for our current entry (`apps/api/src/index.ts`)

Source: files in this repo; <https://vercel.com/docs/functions/runtimes/node-js>,
<https://vercel.com/docs/functions/runtimes>,
<https://vercel.com/docs/functions/runtimes/node-js> (TypeScript section),
<https://vercel.com/docs/project-configuration/vercel-json#functions>

- The local entry calls `serve({ fetch: app.fetch, port })` from `@hono/node-server`
  and `mkdirSync`'s a `.data` dir for sqlite. Neither belongs in the Vercel entry:
  functions have a read-only filesystem (only `/tmp` writable), and the Vercel entry
  must instead export the app (§3). Keep `apps/api/src/app.ts`'s `createApp(db)`
  factory as the shared core; the Vercel entry becomes roughly:

  ```ts
  // apps/web/api/index.ts
  import { createApp } from "@todo/api/app";  // or a relative ../../api/src/app import
  export default createApp(db);               // Hono instance = fetch-standard export
  ```

  (Vercel *does* document capturing a `server.listen()`-style Node server, but only
  for `server.{ts,js}` / `src/server.*` entrypoints in a Node/Hono-preset project —
  whether `@hono/node-server`'s `serve()` would be captured is not documented; don't
  rely on it.)
- **Path prefix:** the function will receive original `/api/...` URLs (§3), so the
  Hono app must mount routes under `/api` (e.g. `app.basePath('/api')`) — today the
  local app serves at the root and the web app proxies; this changes with the rewrite
  approach.
- **Env vars:** available via `process.env` at runtime (Node runtime supports all
  Node APIs; env vars are set per-project/environment in Vercel, 64 KB total limit).
  Vite's `VITE_*` variables are inlined at build time as usual — with same-origin
  `/api` the SPA no longer needs an API base URL env at all.
- **Bundling workspace deps:** "The Node.js runtime takes an entrypoint of a Node.js
  function, builds its dependencies (if any) and bundles them into a Vercel Function"
  — `@todo/shared` and the api sources get traced and bundled from the entry import
  graph. TypeScript works in `api/` files, but the compiler options exclude "Path
  Mappings" and "Project References" — import workspace packages by package name or
  relative path, not tsconfig `paths` aliases.
- **`includeFiles` / native modules:** `functions.<glob>.includeFiles` exists for
  assets the bundler can't trace (e.g. migration `.sql` folders if the function ever
  reads them at runtime). With better-sqlite3 replaced by `pg` (VETTA-750), no native
  addons remain, so no special handling is needed; nothing in current docs requires
  `includeFiles` for pure-JS deps.
- **Local dev:** `vercel dev` (from the linked project) is the documented way to run
  the `api/` function + rewrites locally; the existing `pnpm dev` node server remains
  fine for pure API work.

## Sources

- <https://hono.dev/docs/getting-started/vercel>
- <https://github.com/honojs/hono/blob/main/src/adapter/vercel/index.ts>
- <https://github.com/honojs/hono/blob/main/src/adapter/vercel/handler.ts>
- <https://vercel.com/docs/frameworks/backend/hono>
- <https://vercel.com/docs/functions>
- <https://vercel.com/docs/functions/functions-api-reference>
- <https://vercel.com/docs/functions/runtimes>
- <https://vercel.com/docs/functions/runtimes/node-js>
- <https://vercel.com/docs/functions/runtimes/edge>
- <https://vercel.com/docs/project-configuration/vercel-json>
- <https://vercel.com/docs/builds/configure-a-build>
- <https://vercel.com/docs/monorepos>
- <https://vercel.com/docs/monorepos/monorepo-faq>
- <https://vercel.com/docs/package-managers>
- <https://vercel.com/docs/services>
- <https://vercel.com/kb/guide/using-express-with-vercel>
