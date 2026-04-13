import { initDb, getDb } from "./provider.js";

async function init() {
  console.log("[db:init] Initializing database…");
  try {
    await initDb();
    console.log("[db:init] Schema applied successfully.");
  } catch (err) {
    console.error("[db:init] Failed to apply schema:", err);
    process.exitCode = 1;
  } finally {
    const db = getDb();
    await db.close();
  }
}

init();
