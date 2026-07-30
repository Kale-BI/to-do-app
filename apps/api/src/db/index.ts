import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Production: pooled Neon connection string; migrations are applied by the
// deploy pipeline against the unpooled URL, never at runtime.
export function createDb(connectionString: string): Db {
  return drizzleNodePg({ client: new Pool({ connectionString }), schema });
}

// Local dev and tests: embedded Postgres, migrated on startup. In-memory when
// no dataDir is given.
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const db = drizzlePglite({ client: new PGlite(dataDir), schema });
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  return db;
}
