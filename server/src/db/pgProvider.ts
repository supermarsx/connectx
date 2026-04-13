import pg from "pg";
import type { DbProvider, QueryFn, QueryResult } from "./types.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class PgProvider implements DbProvider {
  private pool: pg.Pool;
  private healthCheckInterval?: ReturnType<typeof setInterval>;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
    this.pool.on("error", (err) => {
      console.error("[pg] Unexpected pool error:", err.message);
    });
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const result = await this.pool.query<T & pg.QueryResultRow>(text, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }

  async transaction<T>(fn: (query: QueryFn) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const txQuery: QueryFn = async <R = Record<string, unknown>>(
        text: string,
        params?: unknown[],
      ): Promise<QueryResult<R>> => {
        const result = await client.query<R & pg.QueryResultRow>(text, params);
        return { rows: result.rows, rowCount: result.rowCount ?? 0 };
      };
      const result = await fn(txQuery);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async init(schemaPath?: string): Promise<void> {
    const path = schemaPath ?? join(__dirname, "schema.sql");
    const sql = readFileSync(path, "utf-8");
    await this.pool.query(sql);

    // Periodic health check every 30s
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck().catch(() => {});
    }, 30_000);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch (err) {
      console.warn("[pg] Health check failed:", (err as Error).message);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    await this.pool.end();
  }
}
