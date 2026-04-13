import type { OnlineMatch } from "./matchManager.js";
import { isValidMove } from "../engine/board.js";
import { redis } from "../db/redis.js";

const MOVE_RATE_LIMIT = 2; // max moves per second
const MOVE_WINDOW_MS = 1000;

const moveTimestamps = new Map<string, number[]>();

// Periodically clean up stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of moveTimestamps) {
    const recent = timestamps.filter(t => now - t < MOVE_WINDOW_MS);
    if (recent.length === 0) {
      moveTimestamps.delete(userId);
    } else {
      moveTimestamps.set(userId, recent);
    }
  }
}, 5 * 60 * 1000);

/** Load existing rate-limit timestamps from Redis into the local cache. */
export async function recoverRateLimitsFromRedis(userId: string): Promise<void> {
  try {
    const now = Date.now();
    const key = `connectx:ratelimit:${userId}`;
    // Fetch only timestamps within the current window
    const entries = await redis.zrangebyscore(key, now - MOVE_WINDOW_MS, "+inf");
    if (entries.length > 0) {
      const timestamps = entries.map(Number).filter((t: number) => !isNaN(t));
      moveTimestamps.set(userId, timestamps);
    }
  } catch (err: unknown) {
    console.error(`[antiCheat] Failed to recover rate limits for ${userId}:`, err);
  }
}

/** Check that a player isn't submitting moves faster than allowed */
export async function validateMoveRate(userId: string, now: number): Promise<boolean> {
  let timestamps = moveTimestamps.get(userId);
  if (!timestamps) {
    // L1 cache miss — hydrate from Redis
    await recoverRateLimitsFromRedis(userId);
    timestamps = moveTimestamps.get(userId);
    if (!timestamps) {
      timestamps = [];
      moveTimestamps.set(userId, timestamps);
    }
  }

  // Remove timestamps outside the window
  while (timestamps.length > 0 && timestamps[0] <= now - MOVE_WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= MOVE_RATE_LIMIT) {
    return false;
  }

  timestamps.push(now);

  // Persist to Redis for cross-restart tracking
  redis.zadd(`connectx:ratelimit:${userId}`, now, `${now}`).catch(() => {});
  redis.zremrangebyscore(`connectx:ratelimit:${userId}`, "-inf", now - MOVE_WINDOW_MS).catch(() => {});
  redis.expire(`connectx:ratelimit:${userId}`, 5).catch(() => {});

  return true;
}

/** Ensure it's this player's turn */
export function validateTurnOrder(
  match: OnlineMatch,
  userId: string,
): boolean {
  const currentPlayer = match.players[match.currentTurnIndex];
  return currentPlayer.userId === userId;
}

/** Validate that the column is an integer, in range, and not full */
export function validateMoveInput(col: number, match: OnlineMatch): boolean {
  if (!Number.isInteger(col)) return false;
  if (col < 0 || col >= match.config.cols) return false;
  return isValidMove(match.board, col, match.blockedCells);
}

/** Remove rate-limit entries for a user (call on match cleanup). */
export function clearUserRateLimit(userId: string): void {
  moveTimestamps.delete(userId);
}

/** Log suspicious activity to Redis for later review */
export function logSuspiciousActivity(
  userId: string,
  type: string,
  details: string,
): void {
  const entry = JSON.stringify({
    userId,
    type,
    details,
    timestamp: Date.now(),
  });
  redis.lpush("connectx:anticheat:log", entry).catch((err: unknown) => {
    console.error("[antiCheat] Failed to log suspicious activity:", err);
  });
  redis.ltrim("connectx:anticheat:log", 0, 9999).catch(() => {});
  console.warn(
    `[antiCheat] Suspicious: user=${userId} type=${type} ${details}`,
  );
}
