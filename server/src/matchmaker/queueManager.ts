import { moderationService } from "../moderation/moderationService.js";

export interface QueuePreferences {
  mode: "classic" | "fullboard";
  connectN: 4 | 5 | 6;
  allowBots: boolean;
}

export interface QueueEntry {
  userId: string;
  name: string;
  rating: number;
  joinedAt: number;
  preferences: QueuePreferences;
}

const RATING_RANGE_INITIAL = 200;
const RATING_RANGE_EXPANDED = 400;
const EXPAND_THRESHOLD_MS = 30_000;
const MATCH_ANYONE_THRESHOLD_MS = 60_000;

export class QueueBucket {
  private entries: QueueEntry[] = [];

  add(entry: QueueEntry): number {
    if (this.entries.some((e) => e.userId === entry.userId)) {
      return this.getPosition(entry.userId);
    }
    this.entries.push(entry);
    return this.entries.length;
  }

  remove(userId: string): boolean {
    const idx = this.entries.findIndex((e) => e.userId === userId);
    if (idx === -1) return false;
    this.entries.splice(idx, 1);
    return true;
  }

  size(): number {
    return this.entries.length;
  }

  peek(n: number): QueueEntry[] {
    return this.entries.slice(0, n);
  }

  take(n: number): QueueEntry[] {
    return this.entries.splice(0, n);
  }

  /** Find and take a rating-compatible pair of players. */
  async takeRatingMatch(now: number): Promise<QueueEntry[] | null> {
    if (this.entries.length < 2) return null;

    for (let i = 0; i < this.entries.length; i++) {
      const a = this.entries[i];
      const waitTime = now - a.joinedAt;
      const range =
        waitTime >= MATCH_ANYONE_THRESHOLD_MS
          ? Infinity
          : waitTime >= EXPAND_THRESHOLD_MS
            ? RATING_RANGE_EXPANDED
            : RATING_RANGE_INITIAL;

      for (let j = i + 1; j < this.entries.length; j++) {
        const b = this.entries[j];
        const bWaitTime = now - b.joinedAt;
        const bRange =
          bWaitTime >= MATCH_ANYONE_THRESHOLD_MS
            ? Infinity
            : bWaitTime >= EXPAND_THRESHOLD_MS
              ? RATING_RANGE_EXPANDED
              : RATING_RANGE_INITIAL;

        const diff = Math.abs(a.rating - b.rating);
        if (diff <= range || diff <= bRange) {
          // Skip pair if either player has blocked the other
          const blocked = await moderationService.isBlocked(a.userId, b.userId)
            || await moderationService.isBlocked(b.userId, a.userId);
          if (blocked) continue;

          // Remove both (higher index first to preserve indices)
          this.entries.splice(j, 1);
          this.entries.splice(i, 1);
          return [a, b];
        }
      }
    }

    return null;
  }

  getPosition(userId: string): number {
    const idx = this.entries.findIndex((e) => e.userId === userId);
    return idx === -1 ? -1 : idx + 1;
  }

  getAll(): QueueEntry[] {
    return [...this.entries];
  }
}
