import { getBotMove } from "./engine/bot.js";
import { config } from "./config.js";
import type {
  BotInstance,
  BotMatchState,
  BotDifficulty,
  Board,
} from "./types.js";

/**
 * Manages all active bot instances and their match states.
 * Computes moves when it's a bot's turn and calls the provided callback.
 */
export class BotManager {
  /** botId → BotInstance */
  private bots = new Map<string, BotInstance>();
  /** matchId → local match state */
  private matchStates = new Map<string, BotMatchState>();
  /** Tracks in-flight bot turns to prevent duplicate scheduling */
  private inflight = new Set<string>();

  private onMoveReady:
    | ((matchId: string, botId: string, col: number) => void)
    | null = null;

  setMoveCallback(
    cb: (matchId: string, botId: string, col: number) => void,
  ): void {
    this.onMoveReady = cb;
  }

  // ── Bot lifecycle ──

  spawnBot(
    matchId: string,
    botId: string,
    difficulty: BotDifficulty,
    playerIndex: number,
    color: string,
    name: string,
  ): void {
    if (this.bots.size >= config.MAX_CONCURRENT_BOTS) {
      console.warn(
        `[botManager] At capacity (${config.MAX_CONCURRENT_BOTS}) — rejecting spawn for ${name}`,
      );
      return;
    }

    const bot: BotInstance = {
      botId,
      matchId,
      difficulty,
      playerIndex,
      color,
      name,
    };
    this.bots.set(botId, bot);
    console.log(
      `[botManager] Spawned bot ${name} (${difficulty}) id=${botId} in match ${matchId}`,
    );
  }

  despawnBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (bot) {
      console.log(
        `[botManager] Despawned bot ${bot.name} id=${botId} from match ${bot.matchId}`,
      );
      this.bots.delete(botId);
    }
  }

  despawnMatchBots(matchId: string): void {
    for (const [botId, bot] of this.bots) {
      if (bot.matchId === matchId) {
        this.bots.delete(botId);
      }
    }
    this.matchStates.delete(matchId);
  }

  // ── Match state tracking ──

  setMatchState(matchId: string, state: BotMatchState): void {
    this.matchStates.set(matchId, state);
  }

  updateBoard(matchId: string, board: Board, currentTurn: string): void {
    const state = this.matchStates.get(matchId);
    if (state) {
      state.board = board;
      state.currentTurn = currentTurn;
    }
  }

  updateRoundState(
    matchId: string,
    board: Board,
    blockedCells: boolean[][],
    currentTurn: string,
  ): void {
    const state = this.matchStates.get(matchId);
    if (state) {
      state.board = board;
      state.blockedCells = blockedCells;
      state.currentTurn = currentTurn;
    }
  }

  // ── Turn scheduling ──

  /**
   * Check if any bot in the given match is the current player.
   * If so, schedule a move with a human-like delay.
   */
  scheduleMoveIfNeeded(matchId: string): void {
    const state = this.matchStates.get(matchId);
    if (!state || state.status !== "active") return;

    // Find a bot in this match whose turn it is
    for (const [botId, bot] of this.bots) {
      if (bot.matchId !== matchId) continue;

      const player = state.players.find((p) => p.userId === bot.botId);
      if (!player) continue;

      if (state.currentTurn === bot.botId) {
        this.scheduleMove(matchId, botId, bot, state);
        return; // Only one bot can have the current turn
      }
    }
  }

  private scheduleMove(
    matchId: string,
    botId: string,
    bot: BotInstance,
    state: BotMatchState,
  ): void {
    const key = `${matchId}:${botId}`;
    if (this.inflight.has(key)) return;

    this.inflight.add(key);

    const delay =
      config.BOT_MIN_DELAY_MS +
      Math.random() * (config.BOT_MAX_DELAY_MS - config.BOT_MIN_DELAY_MS);

    setTimeout(() => {
      try {
        // Re-check state — match may have ended during delay
        const currentState = this.matchStates.get(matchId);
        if (!currentState || currentState.status !== "active") return;
        if (currentState.currentTurn !== botId) return;

        const enginePlayerId = bot.playerIndex + 1; // 1-indexed
        const playerCount = currentState.players.length;

        const col = getBotMove(
          currentState.board,
          enginePlayerId,
          bot.difficulty,
          currentState.config,
          currentState.blockedCells,
          playerCount,
        );

        if (col === -1) {
          console.warn(
            `[botManager] No valid moves for bot ${botId} in match ${matchId}`,
          );
          return;
        }

        if (this.onMoveReady) {
          this.onMoveReady(matchId, botId, col);
        }
      } catch (err) {
        console.error(`[botManager] Error computing move for bot ${botId}:`, err);
      } finally {
        this.inflight.delete(key);
      }
    }, delay);
  }

  // ── Stats ──

  get activeBotCount(): number {
    return this.bots.size;
  }

  get activeMatchCount(): number {
    return this.matchStates.size;
  }

  getBotsInMatch(matchId: string): BotInstance[] {
    const result: BotInstance[] = [];
    for (const bot of this.bots.values()) {
      if (bot.matchId === matchId) {
        result.push(bot);
      }
    }
    return result;
  }
}

export const botManager = new BotManager();
