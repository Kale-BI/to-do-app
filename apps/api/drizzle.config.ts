import { defineConfig } from "drizzle-kit";

// Migrations must use Neon's direct (unpooled) connection, never PgBouncer.
// `generate` never connects, so the var may be absent locally; `migrate`
// fails fast on missing credentials instead of silently using a pooled URL.
const migrationUrl = process.env.DATABASE_URL_UNPOOLED;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(migrationUrl ? { dbCredentials: { url: migrationUrl } } : {}),
});
