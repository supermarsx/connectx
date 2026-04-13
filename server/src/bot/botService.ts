import { v4 as uuidv4 } from "uuid";
import type { BotDifficulty } from "../engine/types.js";
import { getBotMove } from "../engine/bot.js";
import { matchManager } from "../game/matchManager.js";
import type { MoveOutcome } from "../game/matchManager.js";

export interface BotInstance {
  userId: string;
  name: string;
  difficulty: BotDifficulty;
  matchId: string;
  color: string;
}

const BOT_NAMES: Record<BotDifficulty, string> = {
  easy: "Bot Easy",
  medium: "Bot Medium",
  hard: "Bot Hard",
};

const BOT_COLORS: Record<BotDifficulty, string> = {
  easy: "#64E0C6",
  medium: "#FFD36B",
  hard: "#B388FF",
};

export class BotService {
  private bots = new Map<string, BotInstance>();
  private moveResultCallback:
    | ((matchId: string, outcome: MoveOutcome) => Promise<void>)
    | null = null;

  setMoveResultCallback(
    cb: (matchId: string, outcome: MoveOutcome) => Promise<void>,
  ): void {
    this.moveResultCallback = cb;
  }

  createBotPlayer(matchId: string, difficulty: BotDifficulty): BotInstance {
    const userId = `bot-${uuidv4()}`;
    const bot: BotInstance = {
      userId,
      name: BOT_NAMES[difficulty],
      difficulty,
      matchId,
      color: BOT_COLORS[difficulty],
    };

    this.bots.set(userId, bot);
    return bot;
  }

  removeBotPlayer(matchId: string, botUserId: string): void {
    const bot = this.bots.get(botUserId);
    if (bot && bot.matchId === matchId) {
      this.bots.delete(botUserId);
    }
  }

  requestBotMove(matchId: string, botUserId: string): number {
    const match = matchManager.getMatch(matchId);
    if (!match) return -1;

    const bot = this.bots.get(botUserId);
    if (!bot) return -1;

    const player = match.players.find((p) => p.userId === botUserId);
    if (!player) return -1;

    const enginePlayerId = player.playerIndex + 1;
    const config = {
      rows: match.config.rows,
      cols: match.config.cols,
      connectN: match.config.connectN,
    };

    return getBotMove(
      match.board,
      enginePlayerId,
      bot.difficulty,
      config,
      match.blockedCells,
    );
  }

  async handleBotTurn(matchId: string, botUserId: string): Promise<void> {
    const delay = 500 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const match = matchManager.getMatch(matchId);
    if (!match || match.status !== "active") return;

    const col = this.requestBotMove(matchId, botUserId);
    if (col === -1) return;

    const outcome = await matchManager.processMove(matchId, botUserId, col, true);

    if (this.moveResultCallback && outcome.type !== "invalid") {
      await this.moveResultCallback(matchId, outcome);
    }
  }

  isBot(userId: string): boolean {
    return userId.startsWith("bot-");
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

export const botService = new BotService();
