import type { Server } from "socket.io";
import type { Namespace, Socket } from "socket.io";
import { config } from "../config.js";
import { matchManager } from "../game/matchManager.js";
import type { MoveOutcome } from "../game/matchManager.js";
import type {
  BotSpawnRequest,
  BotMatchStarted,
  BotStateUpdate,
  BotRoundStarted,
  BotMatchEnded,
  BotMoveSubmission,
  ServerToBotEvents,
  BotToServerEvents,
} from "@connectx/shared";

type BotNamespace = Namespace<BotToServerEvents, ServerToBotEvents>;

// ── State ──

let botNamespace: BotNamespace | null = null;
let connectedBotService: Socket<BotToServerEvents, ServerToBotEvents> | null = null;
let moveResultCallback: ((matchId: string, outcome: MoveOutcome) => Promise<void>) | null = null;

export function isBotServiceConnected(): boolean {
  return connectedBotService !== null && connectedBotService.connected;
}

export function setBotMoveResultCallback(
  cb: (matchId: string, outcome: MoveOutcome) => Promise<void>,
): void {
  moveResultCallback = cb;
}

/**
 * Initialize the /bot-service namespace on the Socket.IO server.
 */
export function initBotNamespace(io: Server): void {
  botNamespace = io.of("/bot-service") as BotNamespace;

  // Authenticate bot service via shared secret
  botNamespace.use((socket, next) => {
    const secret = socket.handshake.auth?.secret;
    if (!secret || secret !== config.BOT_SERVICE_SECRET) {
      console.warn("[botNamespace] Bot service connection rejected: invalid secret");
      next(new Error("Authentication failed"));
      return;
    }
    next();
  });

  botNamespace.on("connection", (socket) => {
    console.log(`[botNamespace] Bot service connected (id=${socket.id})`);
    connectedBotService = socket;

    socket.on("bot_service_ready", (data) => {
      console.log(
        `[botNamespace] Bot service ready — max ${data.maxBots} concurrent bots`,
      );

      // Resend all active bot matches for state recovery on reconnect
      const activeMatches = matchManager.getAllActiveMatches();
      for (const match of activeMatches) {
        const botPlayers = match.players.filter((p) => p.isBot);
        if (botPlayers.length === 0) continue;

        for (const bot of botPlayers) {
          socket.emit("bot_spawn", {
            matchId: match.matchId,
            botId: bot.userId,
            difficulty: (bot.name.toLowerCase().includes("easy") ? "easy" :
                         bot.name.toLowerCase().includes("hard") ? "hard" : "medium") as "easy" | "medium" | "hard",
            playerIndex: bot.playerIndex,
            color: bot.color,
            name: bot.name,
          });
        }

        const currentPlayer = match.players[match.currentTurnIndex];
        socket.emit("bot_match_started", {
          matchId: match.matchId,
          board: match.board,
          blockedCells: match.blockedCells,
          turnOrder: match.players.map((p) => p.userId),
          currentTurn: currentPlayer.userId,
          config: {
            rows: match.config.rows,
            cols: match.config.cols,
            connectN: match.config.connectN,
          },
          players: match.players.map((p) => ({
            userId: p.userId,
            name: p.name,
            isBot: p.isBot,
            playerIndex: p.playerIndex,
          })),
        });
      }
    });

    socket.on("bot_move", async (data: BotMoveSubmission) => {
      try {
        const { matchId, botId, col } = data;

        // Validate the move comes from a legitimate bot in an active match
        const match = matchManager.getMatch(matchId);
        if (!match) {
          console.warn(`[botNamespace] bot_move for unknown match ${matchId}`);
          return;
        }

        const botPlayer = match.players.find((p) => p.userId === botId);
        if (!botPlayer || !botPlayer.isBot) {
          console.warn(`[botNamespace] bot_move from non-bot player ${botId}`);
          return;
        }

        // Process the move through the same pipeline as human moves
        // isAutoPlay=true skips anti-cheat (bot is trusted)
        const outcome = await matchManager.processMove(matchId, botId, col, true);

        if (moveResultCallback && outcome.type !== "invalid") {
          await moveResultCallback(matchId, outcome);
        }

        if (outcome.type === "invalid") {
          console.warn(
            `[botNamespace] Invalid bot move: ${outcome.reason} (bot=${botId}, match=${matchId}, col=${col})`,
          );
        }
      } catch (err) {
        console.error("[botNamespace] Error processing bot move:", err);
      }
    });

    socket.on("disconnect", (reason) => {
      console.warn(`[botNamespace] Bot service disconnected: ${reason}`);
      if (connectedBotService === socket) {
        connectedBotService = null;
      }
    });
  });
}

// ── Methods to send events to bot service ──

/** Tell the bot service to spawn a new bot in a match */
export function emitBotSpawn(data: BotSpawnRequest): void {
  if (!connectedBotService) return;
  connectedBotService.emit("bot_spawn", data);
}

/** Tell the bot service to despawn a bot */
export function emitBotDespawn(matchId: string, botId: string): void {
  if (!connectedBotService) return;
  connectedBotService.emit("bot_despawn", { matchId, botId });
}

/** Send match started state to bot service */
export function emitBotMatchStarted(data: BotMatchStarted): void {
  if (!connectedBotService) return;
  connectedBotService.emit("bot_match_started", data);
}

/** Send state update to bot service */
export function emitBotStateUpdate(data: BotStateUpdate): void {
  if (!connectedBotService) return;
  connectedBotService.emit("bot_state_update", data);
}

/** Send round started to bot service */
export function emitBotRoundStarted(data: BotRoundStarted): void {
  if (!connectedBotService) return;
  connectedBotService.emit("bot_round_started", data);
}

/** Send match ended to bot service */
export function emitBotMatchEnded(data: BotMatchEnded): void {
  if (!connectedBotService) return;
  connectedBotService.emit("bot_match_ended", data);
}
