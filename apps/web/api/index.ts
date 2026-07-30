import { createApp } from "@todo/api/app";
import { createDb } from "@todo/api/db";

// Vercel Node function entry: the catch-all for every /api/* route. The
// function receives the original /api-prefixed path, which the Hono app's
// routes already carry, so no basePath adjustment is needed.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

// Module scope on purpose: under Fluid compute, warm instances share the app
// and its pg Pool across invocations.
export default createApp(createDb(connectionString));
