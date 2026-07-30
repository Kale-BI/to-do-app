import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Production: pooled Neon connection string; migrations are applied by the
// deploy pipeline against the unpooled URL, never at runtime. PGlite lives in
// ./pglite so bundling this module doesn't drag in the WASM runtime.
export function createDb(connectionString: string): Db {
  return drizzle({ client: new Pool({ connectionString }), schema });
}
