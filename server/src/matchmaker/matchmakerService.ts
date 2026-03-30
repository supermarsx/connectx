import { v4 as uuidv4 } from "uuid";
import { QueueBucket } from "./queueManager.js";
import type { QueuePreferences } from "./queueManager.js";

export interface MatchedPlayer {
  userId: string;
  name: string;
  color: string;
  isBot: boolean;
}

export interface MatchConfig {
  mode: "classic" | "fullboard";
  connectN: number;
  totalRounds: number;
  rows: number;
  cols: number;
}

export type MatchReadyCallback = (
  matchId: string,
  players: MatchedPlayer[],
  config: MatchConfig,
) => void;

const DEFAULT_COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#EAB308"];
const TICK_INTERVAL = 2000;
const BOT_WAIT_THRESHOLD = 30_000;

function bucketKey(mode: string, connectN: number): string {
  return `${mode}:${connectN}`;
}

function getBoardSize(
  mode: string,
  connectN: number,
): { rows: number; cols: number } {
  if (mode === "fullboard") {
    return { rows: connectN + 2, cols: connectN + 3 };
  }
  return { rows: 6, cols: 7 };
}

export class MatchmakerService {
  private buckets = new Map<string, QueueBucket>();
  private userBucket = new Map<string, string>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private onMatchReady: MatchReadyCallback | null = null;

  constructor() {
    this.startTick();
  }

  setMatchReadyCallback(cb: MatchReadyCallback): void {
    this.onMatchReady = cb;
  }

  joinQueue(
    userId: string,
    userName: string,
    preferences: QueuePreferences,
  ): { position: number } {
    this.leaveQueue(userId);

    const key = bucketKey(preferences.mode, preferences.connectN);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new QueueBucket();
      this.buckets.set(key, bucket);
    }

    const position = bucket.add({
      userId,
      name: userName,
      joinedAt: Date.now(),
      preferences,
    });

    this.userBucket.set(userId, key);
    return { position };
  }

  leaveQueue(userId: string): void {
    const key = this.userBucket.get(userId);
    if (!key) return;

    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.remove(userId);
    }
    this.userBucket.delete(userId);
  }

  getQueuePosition(userId: string): number {
    const key = this.userBucket.get(userId);
    if (!key) return -1;

    const bucket = this.buckets.get(key);
    if (!bucket) return -1;

    return bucket.getPosition(userId);
  }

  shutdown(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private startTick(): void {
    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  private tick(): void {
    const now = Date.now();

    for (const [key, bucket] of this.buckets) {
      if (bucket.size() >= 2) {
        this.formMatch(key, bucket, false);
        continue;
      }

      if (bucket.size() === 1) {
        const entries = bucket.getAll();
        const entry = entries[0];
        if (
          entry.preferences.allowBots &&
          now - entry.joinedAt > BOT_WAIT_THRESHOLD
        ) {
          this.formMatch(key, bucket, true);
        }
      }
    }
  }

  private formMatch(
    key: string,
    bucket: QueueBucket,
    fillWithBots: boolean,
  ): void {
    const [mode, connectNStr] = key.split(":");
    const connectN = parseInt(connectNStr, 10);
    const { rows, cols } = getBoardSize(mode, connectN);

    const humanCount = Math.min(bucket.size(), 2);
    const taken = bucket.take(humanCount);

    for (const entry of taken) {
      this.userBucket.delete(entry.userId);
    }

    const players: MatchedPlayer[] = taken.map((entry, i) => ({
      userId: entry.userId,
      name: entry.name,
      color: DEFAULT_COLORS[i],
      isBot: false,
    }));

    if (fillWithBots && players.length < 2) {
      while (players.length < 2) {
        const botIdx = players.length;
        players.push({
          userId: `bot-${uuidv4().slice(0, 8)}`,
          name: `Bot ${botIdx}`,
          color: DEFAULT_COLORS[botIdx],
          isBot: true,
        });
      }
    }

    if (players.length < 2) return;

    const matchId = uuidv4();
    const config: MatchConfig = {
      mode: mode as "classic" | "fullboard",
      connectN,
      totalRounds: 1,
      rows,
      cols,
    };

    if (this.onMatchReady) {
      this.onMatchReady(matchId, players, config);
    }
  }
}

export const matchmakerService = new MatchmakerService();
