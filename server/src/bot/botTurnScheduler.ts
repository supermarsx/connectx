import { matchManager } from "../game/matchManager.js";
import { botService } from "./botService.js";

/**
 * After every state_update, round start, or match start,
 * check if the current player is a bot and schedule their move.
 */
export function scheduleBotTurnIfNeeded(matchId: string): void {
  const match = matchManager.getMatch(matchId);
  if (!match || match.status !== "active") return;

  const currentPlayer = match.players[match.currentTurnIndex];
  if (botService.isBot(currentPlayer.userId)) {
    botService.handleBotTurn(matchId, currentPlayer.userId).catch((err) =>
      console.error("[botScheduler] Bot turn error:", err),
    );
  }
}
