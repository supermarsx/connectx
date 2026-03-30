export interface QueuePreferences {
  mode: "classic" | "fullboard";
  connectN: 4 | 5 | 6;
  allowBots: boolean;
}

export interface QueueEntry {
  userId: string;
  name: string;
  joinedAt: number;
  preferences: QueuePreferences;
}

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

  getPosition(userId: string): number {
    const idx = this.entries.findIndex((e) => e.userId === userId);
    return idx === -1 ? -1 : idx + 1;
  }

  getAll(): QueueEntry[] {
    return [...this.entries];
  }
}
