import { matchManager } from "../game/matchManager.js";
import { botService } from "./botService.js";

/** Track in-flight bot turns to prevent duplicate scheduling */
const inflight = new Set<string>();

/**
 * After every state_update, round start, or match start,
 * check if the current player is a bot and schedule their move.
 */
export function scheduleBotTurnIfNeeded(matchId: string): void {
  const match = matchManager.getMatch(matchId);
  if (!match || match.status !== "active") return;

  const currentPlayer = match.players[match.currentTurnIndex];
  if (botService.isBot(currentPlayer.userId)) {
    const key = `${matchId}:${currentPlayer.userId}`;
    if (inflight.has(key)) return;
    inflight.add(key);
    botService
      .handleBotTurn(matchId, currentPlayer.userId)
      .catch((err) => console.error("[botScheduler] Bot turn error:", err))
      .finally(() => inflight.delete(key));
  }
}
