import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import type { Db } from "./index";
import * as schema from "./schema";

// Local dev and tests: embedded Postgres, migrated on startup. In-memory when
// no dataDir is given.
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const db = drizzle({ client: new PGlite(dataDir), schema });
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  return db;
}
