import { query } from "../db/provider.js";
import { redis } from "../db/redis.js";

const REPORT_RATE_LIMIT = 5;
const REPORT_RATE_WINDOW = 3600; // 1 hour in seconds

class ModerationService {
  async reportPlayer(
    reporterId: string,
    reportedId: string,
    matchId: string | null,
    reason: string,
    details: string,
  ): Promise<void> {
    // Rate limit: 5 reports per hour per reporter
    const key = `connectx:report_rate:${reporterId}`;
    const count = await redis.incr(key);
    await redis.expire(key, REPORT_RATE_WINDOW);
    if (count > REPORT_RATE_LIMIT) {
      throw new Error("Report rate limit exceeded: maximum 5 reports per hour");
    }

    await query(
      `INSERT INTO reports (reporter_id, reported_id, match_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [reporterId, reportedId, matchId || null, reason, details || ""],
    );
  }

  async blockPlayer(blockerId: string, blockedId: string): Promise<void> {
    await query(
      `INSERT INTO blocked_users (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [blockerId, blockedId],
    );
  }

  async unblockPlayer(blockerId: string, blockedId: string): Promise<void> {
    await query(
      `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId],
    );
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    const res = await query<{ blocked_id: string }>(
      `SELECT blocked_id FROM blocked_users WHERE blocker_id = $1`,
      [userId],
    );
    return res.rows.map((row) => row.blocked_id);
  }

  async isBlocked(userId: string, targetId: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
      [userId, targetId],
    );
    return res.rows.length > 0;
  }

  async getReportCount(userId: string): Promise<number> {
    const res = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM reports WHERE reported_id = $1`,
      [userId],
    );
    return parseInt(res.rows[0]?.count ?? "0", 10);
  }
}

export const moderationService = new ModerationService();
