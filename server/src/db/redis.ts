import Redis from "ioredis";
import { config } from "../config.js";

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("connect", () => {
  console.log("[redis] Connected");
});

redis.on("error", (err) => {
  console.error("[redis] Connection error:", err.message);
});
