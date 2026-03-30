import type { OnlineMatch } from "./matchManager.js";
import { isValidMove } from "../engine/board.js";
import { redis } from "../db/redis.js";

const MOVE_RATE_LIMIT = 2; // max moves per second
const MOVE_WINDOW_MS = 1000;

const moveTimestamps = new Map<string, number[]>();

/** Check that a player isn't submitting moves faster than allowed */
export function validateMoveRate(userId: string, now: number): boolean {
  let timestamps = moveTimestamps.get(userId);
  if (!timestamps) {
    timestamps = [];
    moveTimestamps.set(userId, timestamps);
  }

  // Remove timestamps outside the window
  while (timestamps.length > 0 && timestamps[0] <= now - MOVE_WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= MOVE_RATE_LIMIT) {
    return false;
  }

  timestamps.push(now);
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
  redis.lpush("connectx:anticheat:log", entry).catch((err) => {
    console.error("[antiCheat] Failed to log suspicious activity:", err);
  });
  redis.ltrim("connectx:anticheat:log", 0, 9999).catch(() => {});
  console.warn(
    `[antiCheat] Suspicious: user=${userId} type=${type} ${details}`,
  );
}
