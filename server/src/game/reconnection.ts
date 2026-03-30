export class ReconnectionManager {
  private timers = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; expiresAt: number }
  >();

  private key(matchId: string, userId: string): string {
    return `${matchId}:${userId}`;
  }

  /** Start a timer. If the player doesn't reconnect within timeoutMs, call onTimeout. */
  startTimer(
    matchId: string,
    userId: string,
    timeoutMs: number,
    onTimeout: () => void,
  ): void {
    const k = this.key(matchId, userId);
    this.cancelTimer(matchId, userId);

    const timer = setTimeout(() => {
      this.timers.delete(k);
      onTimeout();
    }, timeoutMs);

    this.timers.set(k, { timer, expiresAt: Date.now() + timeoutMs });
  }

  /** Player reconnected — cancel the timeout. */
  cancelTimer(matchId: string, userId: string): void {
    const k = this.key(matchId, userId);
    const entry = this.timers.get(k);
    if (entry) {
      clearTimeout(entry.timer);
      this.timers.delete(k);
    }
  }

  /** How many ms until the reconnection timeout. */
  getTimeRemaining(matchId: string, userId: string): number {
    const k = this.key(matchId, userId);
    const entry = this.timers.get(k);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}
