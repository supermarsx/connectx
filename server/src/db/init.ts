import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  const schemaPath = join(__dirname, "schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  console.log("[db:init] Running schema migration…");

  try {
    await pool.query(sql);
    console.log("[db:init] Schema applied successfully.");
  } catch (err) {
    console.error("[db:init] Failed to apply schema:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
