import { serve } from "@hono/node-server";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { createDb } from "./db";
import { createPgliteDb } from "./db/pglite";

// DATABASE_URL means a real Postgres (Neon); otherwise fall back to an
// embedded PGlite under .data so local dev stays zero-setup.
async function dbFromEnv() {
  if (process.env.DATABASE_URL) {
    return createDb(process.env.DATABASE_URL);
  }
  const dataDir =
    process.env.DATA_DIR ?? fileURLToPath(new URL("../.data", import.meta.url));
  mkdirSync(dataDir, { recursive: true });
  return createPgliteDb(path.join(dataDir, "pglite"));
}

const app = createApp(await dbFromEnv());

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
});
