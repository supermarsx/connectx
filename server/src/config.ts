import dotenv from "dotenv";

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  DB_PROVIDER: (process.env.DB_PROVIDER || "postgres") as "postgres" | "sqlite",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/connectx",
  SQLITE_PATH: process.env.SQLITE_PATH || "connectx.db",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  JWT_SECRET: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === "change-me-to-a-random-secret-in-production") {
      if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
        console.error("FATAL: JWT_SECRET must be set outside of development");
        process.exit(1);
      }
      console.warn("[config] WARNING: Using default JWT secret. Set JWT_SECRET env var for production.");
      return "dev-secret-do-not-use-in-production";
    }
    return secret;
  })(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  BOT_SERVICE_SECRET: process.env.BOT_SERVICE_SECRET || "bot-service-dev-secret",
  BOT_SERVICE_ENABLED: process.env.BOT_SERVICE_ENABLED !== "false",
  BOT_FALLBACK_ENABLED: process.env.BOT_FALLBACK_ENABLED !== "false",
} as const;
