import { EventEmitter } from "events";
import { redis } from "../db/redis.js";
import * as connectionManager from "../ws/connectionManager.js";

// ── Event types ──

export interface AnalyticsEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface MatchStartedEvent {
  type: "match_started";
  mode: string;
  connectN: number;
  playerCount: number;
  isRanked: boolean;
}

export interface MatchCompletedEvent {
  type: "match_completed";
  matchId: string;
  mode: string;
  duration: number;
  rounds: number;
  winnerIsBot: boolean;
}

export interface MatchAbandonedEvent {
  type: "match_abandoned";
  matchId: string;
  reason: "disconnect" | "timeout";
}

export interface QueueJoinedEvent {
  type: "queue_joined";
  userId: string;
  preferences: Record<string, unknown>;
  rating: number;
}

export interface QueueMatchedEvent {
  type: "queue_matched";
  matchId: string;
  waitTimeMs: number;
  ratingSpread: number;
}

export interface BotGameStartedEvent {
  type: "bot_game_started";
  difficulty: string;
  playerCount: number;
}

export interface UserRegisteredEvent {
  type: "user_registered";
  userId: string;
}

export interface UserLoginEvent {
  type: "user_login";
  userId: string;
}

export type AnalyticsEventData =
  | MatchStartedEvent
  | MatchCompletedEvent
  | MatchAbandonedEvent
  | QueueJoinedEvent
  | QueueMatchedEvent
  | BotGameStartedEvent
  | UserRegisteredEvent
  | UserLoginEvent;

// ── Analytics summary ──

export interface AnalyticsSummary {
  matchesToday: number;
  matchesThisWeek: number;
  avgMatchDuration: number;
  modePopularity: Record<string, number>;
  connectNDistribution: Record<string, number>;
  playerCountDistribution: Record<string, number>;
  avgQueueWaitTime: number;
  activeUsers: number;
}

// ── Redis key ──

const EVENTS_KEY = "connectx:analytics:events";
const MAX_EVENTS = 10000;

// ── Service ──

class AnalyticsService extends EventEmitter {
  async track(event: AnalyticsEventData): Promise<void> {
    const entry: AnalyticsEvent = {
      type: event.type,
      timestamp: new Date().toISOString(),
      data: event as unknown as Record<string, unknown>,
    };

    await redis.lpush(EVENTS_KEY, JSON.stringify(entry));
    await redis.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1);

    this.emit("event", entry);
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const raw: string[] = await redis.lrange(EVENTS_KEY, 0, -1);
    const events: AnalyticsEvent[] = raw.map((r) => JSON.parse(r));

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    let matchesToday = 0;
    let matchesThisWeek = 0;
    let totalDuration = 0;
    let durationCount = 0;
    const modePopularity: Record<string, number> = {};
    const connectNDistribution: Record<string, number> = {};
    const playerCountDistribution: Record<string, number> = {};
    let totalWait = 0;
    let waitCount = 0;

    for (const event of events) {
      const ts = new Date(event.timestamp).getTime();
      const data = event.data;

      if (event.type === "match_started" || event.type === "match_completed") {
        if (ts >= dayAgo) matchesToday++;
        if (ts >= weekAgo) matchesThisWeek++;
      }

      if (event.type === "match_completed") {
        const dur = (data as Record<string, unknown>).duration;
        if (typeof dur === "number") {
          totalDuration += dur;
          durationCount++;
        }
      }

      if (event.type === "match_started") {
        const mode = String((data as Record<string, unknown>).mode ?? "unknown");
        modePopularity[mode] = (modePopularity[mode] ?? 0) + 1;

        const cn = String((data as Record<string, unknown>).connectN ?? "?");
        connectNDistribution[cn] = (connectNDistribution[cn] ?? 0) + 1;

        const pc = String((data as Record<string, unknown>).playerCount ?? "?");
        playerCountDistribution[pc] = (playerCountDistribution[pc] ?? 0) + 1;
      }

      if (event.type === "queue_matched") {
        const wt = (data as Record<string, unknown>).waitTimeMs;
        if (typeof wt === "number") {
          totalWait += wt;
          waitCount++;
        }
      }
    }

    let activeUsers = 0;
    try {
      activeUsers = await connectionManager.getOnlineCount();
    } catch {
      // ignore if unavailable
    }

    return {
      matchesToday,
      matchesThisWeek,
      avgMatchDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      modePopularity,
      connectNDistribution,
      playerCountDistribution,
      avgQueueWaitTime: waitCount > 0 ? Math.round(totalWait / waitCount) : 0,
      activeUsers,
    };
  }
}

export const analyticsService = new AnalyticsService();
