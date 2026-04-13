/** In-memory cache that mirrors the Redis API surface used throughout the app. */

interface Entry {
  value: unknown;
  expireAt?: number;
  timer?: ReturnType<typeof setTimeout>;
}

function matchGlob(pattern: string, text: string): boolean {
  const re = new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
  );
  return re.test(text);
}

export class MemoryCache {
  private store = new Map<string, Entry>();
  private static readonly MAX_ENTRIES = 50_000;

  // ── Scalar operations ──

  async get(key: string): Promise<string | null> {
    const entry = this.alive(key);
    if (!entry) return null;
    return String(entry.value);
  }

  async set(key: string, value: string, ex?: "EX", ttl?: number): Promise<"OK"> {
    this.clearTimer(key);
    const entry: Entry = { value };
    if (ex === "EX" && ttl && ttl > 0) {
      entry.expireAt = Date.now() + ttl * 1000;
      entry.timer = setTimeout(() => this.store.delete(key), ttl * 1000);
    }
    // Evict oldest entries if at capacity
    if (this.store.size >= MemoryCache.MAX_ENTRIES && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.clearTimer(firstKey);
        this.store.delete(firstKey);
      }
    }
    this.store.set(key, entry);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      this.clearTimer(key);
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const entry = this.alive(key);
    const current = entry ? Number(entry.value) || 0 : 0;
    const next = current + 1;
    if (entry) {
      entry.value = next;
    } else {
      this.store.set(key, { value: next });
    }
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.alive(key);
    if (!entry) return 0;
    this.clearTimer(key);
    entry.expireAt = Date.now() + seconds * 1000;
    entry.timer = setTimeout(() => this.store.delete(key), seconds * 1000);
    return 1;
  }

  async keys(pattern: string): Promise<string[]> {
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if (this.alive(key) && matchGlob(pattern, key)) {
        result.push(key);
      }
    }
    return result;
  }

  // ── List operations ──

  async lpush(key: string, ...values: string[]): Promise<number> {
    const list = this.getList(key);
    list.unshift(...values);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    const list = this.getList(key);
    const trimmed = list.slice(start, stop < 0 ? list.length + stop + 1 : stop + 1);
    this.setList(key, trimmed);
    return "OK";
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.getList(key);
    return list.slice(start, stop < 0 ? list.length + stop + 1 : stop + 1);
  }

  // ── Set operations ──

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.getSet(key);
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) { set.add(m); added++; }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.getSet(key);
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) removed++;
    }
    return removed;
  }

  async scard(key: string): Promise<number> {
    return this.getSet(key).size;
  }

  // ── Sorted-set operations ──

  async zadd(key: string, score: number, member: string): Promise<number> {
    const zset = this.getSortedSet(key);
    const existed = zset.has(member);
    zset.set(member, score);
    return existed ? 0 : 1;
  }

  async zrem(key: string, member: string): Promise<number> {
    const zset = this.getSortedSet(key);
    return zset.delete(member) ? 1 : 0;
  }

  async zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
    const zset = this.getSortedSet(key);
    const lo = min === "-inf" ? -Infinity : Number(min);
    const hi = max === "+inf" ? Infinity : Number(max);
    const entries = [...zset.entries()]
      .filter(([, s]) => s >= lo && s <= hi)
      .sort((a, b) => a[1] - b[1]);
    return entries.map(([m]) => m);
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    const zset = this.getSortedSet(key);
    const lo = min === "-inf" ? -Infinity : Number(min);
    const hi = max === "+inf" ? Infinity : Number(max);
    let removed = 0;
    for (const [member, score] of zset) {
      if (score >= lo && score <= hi) {
        zset.delete(member);
        removed++;
      }
    }
    return removed;
  }

  // ── Pipeline ──

  pipeline(): MemoryPipeline {
    return new MemoryPipeline(this);
  }

  // ── Connection stubs ──

  async ping(): Promise<string> {
    return "PONG";
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async quit(): Promise<void> {}

  // ── Internal helpers ──

  private alive(key: string): Entry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expireAt && Date.now() >= entry.expireAt) {
      this.clearTimer(key);
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  private clearTimer(key: string): void {
    const entry = this.store.get(key);
    if (entry?.timer) clearTimeout(entry.timer);
  }

  private getList(key: string): string[] {
    const entry = this.alive(key);
    if (!entry) {
      const list: string[] = [];
      this.store.set(key, { value: list });
      return list;
    }
    return entry.value as string[];
  }

  private setList(key: string, list: string[]): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.value = list;
    } else {
      this.store.set(key, { value: list });
    }
  }

  private getSet(key: string): Set<string> {
    const entry = this.alive(key);
    if (!entry) {
      const s = new Set<string>();
      this.store.set(key, { value: s });
      return s;
    }
    return entry.value as Set<string>;
  }

  private getSortedSet(key: string): Map<string, number> {
    const entry = this.alive(key);
    if (!entry) {
      const m = new Map<string, number>();
      this.store.set(key, { value: m });
      return m;
    }
    return entry.value as Map<string, number>;
  }
}

type QueuedOp = () => Promise<unknown>;

class MemoryPipeline {
  private ops: QueuedOp[] = [];

  constructor(private cache: MemoryCache) {}

  get(key: string) { this.ops.push(() => this.cache.get(key)); return this; }
  set(key: string, value: string, ex?: "EX", ttl?: number) { this.ops.push(() => this.cache.set(key, value, ex, ttl)); return this; }
  del(...keys: string[]) { this.ops.push(() => this.cache.del(...keys)); return this; }
  incr(key: string) { this.ops.push(() => this.cache.incr(key)); return this; }
  expire(key: string, seconds: number) { this.ops.push(() => this.cache.expire(key, seconds)); return this; }
  lpush(key: string, ...values: string[]) { this.ops.push(() => this.cache.lpush(key, ...values)); return this; }
  ltrim(key: string, start: number, stop: number) { this.ops.push(() => this.cache.ltrim(key, start, stop)); return this; }
  lrange(key: string, start: number, stop: number) { this.ops.push(() => this.cache.lrange(key, start, stop)); return this; }
  sadd(key: string, ...members: string[]) { this.ops.push(() => this.cache.sadd(key, ...members)); return this; }
  srem(key: string, ...members: string[]) { this.ops.push(() => this.cache.srem(key, ...members)); return this; }
  scard(key: string) { this.ops.push(() => this.cache.scard(key)); return this; }
  zadd(key: string, score: number, member: string) { this.ops.push(() => this.cache.zadd(key, score, member)); return this; }
  zrem(key: string, member: string) { this.ops.push(() => this.cache.zrem(key, member)); return this; }
  zrangebyscore(key: string, min: number | string, max: number | string) { this.ops.push(() => this.cache.zrangebyscore(key, min, max)); return this; }
  zremrangebyscore(key: string, min: number | string, max: number | string) { this.ops.push(() => this.cache.zremrangebyscore(key, min, max)); return this; }

  async exec(): Promise<[Error | null, unknown][]> {
    const results: [Error | null, unknown][] = [];
    for (const op of this.ops) {
      try {
        const result = await op();
        results.push([null, result]);
      } catch (err) {
        results.push([err as Error, null]);
      }
    }
    return results;
  }
}
