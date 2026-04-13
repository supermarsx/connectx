import { config } from "../config.js";

let redis: any;

if (config.DB_PROVIDER === "sqlite") {
  const { MemoryCache } = await import("./memoryCache.js");
  redis = new MemoryCache();
  console.log("[cache] Using in-memory cache (local mode)");
} else {
  const Redis = (await import("ioredis")).default;
  redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
  redis.on("connect", () => console.log("[redis] Connected"));
  redis.on("error", (err: Error) => console.error("[redis] Connection error:", err.message));
}

export { redis };
