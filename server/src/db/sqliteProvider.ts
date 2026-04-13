import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DbProvider, QueryFn, QueryResult } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Convert PostgreSQL-dialect SQL to SQLite-compatible SQL.
 *
 * Handles: positional params ($1→?), gen_random_uuid(), NOW(),
 * GREATEST()→MAX(), TIMESTAMPTZ→TEXT.
 */
export function convertPgToSqlite(sql: string): string {
  let result = sql;

  // Replace $N positional params with ? (must process in order)
  result = result.replace(/\$\d+/g, "?");

  // Replace gen_random_uuid() with a freshly generated UUID literal
  result = result.replace(/gen_random_uuid\(\)/gi, () => `'${uuidv4()}'`);

  // Replace NOW() with datetime('now')
  result = result.replace(/\bNOW\(\)/gi, "datetime('now')");

  // Replace GREATEST( with MAX(
  result = result.replace(/\bGREATEST\s*\(/gi, "MAX(");

  // Replace TIMESTAMPTZ with TEXT
  result = result.replace(/\bTIMESTAMPTZ\b/gi, "TEXT");

  return result;
}

export class SqliteProvider implements DbProvider {
  private db!: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const converted = convertPgToSqlite(text);
    const trimmed = converted.trim();

    // Determine if the statement returns rows
    const isSelect =
      /^(SELECT|INSERT\b.*RETURNING|UPDATE\b.*RETURNING|DELETE\b.*RETURNING)/i.test(
        trimmed,
      );

    if (isSelect) {
      const stmt = this.db.prepare(converted);
      const rows = stmt.all(...(params ?? [])) as T[];
      return { rows, rowCount: rows.length };
    }

    const stmt = this.db.prepare(converted);
    const info = stmt.run(...(params ?? []));
    return { rows: [] as T[], rowCount: info.changes };
  }

  async transaction<T>(fn: (query: QueryFn) => Promise<T>): Promise<T> {
    // We use a savepoint approach so transactions can nest safely.
    const savepointName = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.db.exec(`SAVEPOINT ${savepointName}`);
    try {
      const result = await fn(this.query.bind(this));
      this.db.exec(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (err) {
      this.db.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      throw err;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async init(schemaPath?: string): Promise<void> {
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    const path = schemaPath ?? join(__dirname, "schema-sqlite.sql");
    const sql = readFileSync(path, "utf-8");
    this.db.exec(sql);
  }
}
