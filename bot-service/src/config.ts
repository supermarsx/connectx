import dotenv from "dotenv";

dotenv.config();

export const config = {
  /** URL of the main ConnectX game server */
  GAME_SERVER_URL: process.env.GAME_SERVER_URL || "http://localhost:3001",
  /** Shared secret for bot service authentication */
  BOT_SERVICE_SECRET:
    process.env.BOT_SERVICE_SECRET || "bot-service-dev-secret",
  /** How many concurrent bot instances this service can handle */
  MAX_CONCURRENT_BOTS: parseInt(
    process.env.MAX_CONCURRENT_BOTS || "100",
    10,
  ),
  /** Minimum delay before bot plays (ms) — humanlike feel */
  BOT_MIN_DELAY_MS: parseInt(process.env.BOT_MIN_DELAY_MS || "500", 10),
  /** Maximum delay before bot plays (ms) */
  BOT_MAX_DELAY_MS: parseInt(process.env.BOT_MAX_DELAY_MS || "1500", 10),
  /** Log level */
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
} as const;
