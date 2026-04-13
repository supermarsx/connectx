import { config } from "../config.js";
import type { DbProvider, QueryResult } from "./types.js";

let provider: DbProvider;

export async function initDb(): Promise<void> {
  if (config.DB_PROVIDER === "sqlite") {
    const { SqliteProvider } = await import("./sqliteProvider.js");
    provider = new SqliteProvider(config.SQLITE_PATH);
  } else {
    const { PgProvider } = await import("./pgProvider.js");
    provider = new PgProvider(config.DATABASE_URL);
  }
  await provider.init();
}

export function getDb(): DbProvider {
  if (!provider)
    throw new Error("Database not initialized. Call initDb() first.");
  return provider;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getDb().query<T>(text, params);
}
