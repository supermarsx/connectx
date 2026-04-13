import "dotenv/config";
import http from "node:http";
import { config } from "./config.js";
import { initDb } from "./db/provider.js";
import { createApp } from "./gateway/app.js";
import { createSocketServer } from "./ws/wsServer.js";
import { matchManager } from "./game/matchManager.js";
import { redis } from "./db/redis.js";

await initDb();

const app = createApp();
export const httpServer = http.createServer(app);

createSocketServer(httpServer);

httpServer.listen(config.PORT, async () => {
  console.log(`[server] ConnectX server listening on port ${config.PORT}`);
  console.log(`[server] CORS origin: ${config.CORS_ORIGIN}`);

  // Recover any in-flight matches from Redis after a restart
  try {
    await redis.connect();
    await matchManager.recoverMatchesFromRedis();
  } catch {
    // Redis may already be connected or unavailable — non-fatal
  }
});

async function gracefulShutdown(signal: string) {
  console.log(`[server] ${signal} received. Shutting down gracefully…`);

  // Hard timeout: force exit after 10 seconds if cleanup hangs
  const forceExitTimer = setTimeout(() => {
    console.error("[server] Shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  httpServer.close();
  try {
    await matchManager.persistAllMatchesToRedis();
  } catch (err) {
    console.error("[server] Failed to persist matches:", err);
  }
  try {
    const { getDb } = await import("./db/provider.js");
    await getDb().close();
  } catch {}
  try {
    if (redis.quit) await redis.quit();
  } catch {}
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
