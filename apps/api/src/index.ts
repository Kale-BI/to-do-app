import { serve } from "@hono/node-server";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { createDb } from "./db";

const dataDir =
  process.env.DATA_DIR ?? fileURLToPath(new URL("../.data", import.meta.url));
mkdirSync(dataDir, { recursive: true });

const app = createApp(createDb(path.join(dataDir, "todo.db")));

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
});
