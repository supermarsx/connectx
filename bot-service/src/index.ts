import "dotenv/config";
import { config } from "./config.js";
import { connectToServer, disconnectFromServer } from "./connection.js";
import { botManager } from "./botManager.js";
import { startHealthServer, stopHealthServer } from "./health.js";

console.log("[bot-service] Starting ConnectX Bot Service...");
console.log(`[bot-service] Game server: ${config.GAME_SERVER_URL}`);
console.log(`[bot-service] Max concurrent bots: ${config.MAX_CONCURRENT_BOTS}`);
console.log(
  `[bot-service] Move delay: ${config.BOT_MIN_DELAY_MS}-${config.BOT_MAX_DELAY_MS}ms`,
);

const socket = connectToServer();

startHealthServer();

// Health logging
const healthInterval = setInterval(() => {
  if (botManager.activeBotCount > 0) {
    console.log(
      `[bot-service] Active bots: ${botManager.activeBotCount}, ` +
        `Active matches: ${botManager.activeMatchCount}`,
    );
  }
}, 30_000);
healthInterval.unref();

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`[bot-service] ${signal} received. Shutting down...`);

  const forceExitTimer = setTimeout(() => {
    console.error("[bot-service] Shutdown timed out — forcing exit");
    process.exit(1);
  }, 5_000);
  forceExitTimer.unref();

  clearInterval(healthInterval);
  stopHealthServer();
  disconnectFromServer();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { socket, botManager };
