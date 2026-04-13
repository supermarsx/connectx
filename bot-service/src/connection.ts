import { io, type Socket } from "socket.io-client";
import { config } from "./config.js";
import { botManager } from "./botManager.js";
import type {
  BotSpawnRequest,
  BotMatchStarted,
  BotStateUpdate,
  BotRoundStarted,
  BotMatchEnded,
  BotDespawnRequest,
  BotMoveSubmission,
  ServerToBotEvents,
  BotToServerEvents,
} from "./types.js";

type BotSocket = Socket<ServerToBotEvents, BotToServerEvents>;

let socket: BotSocket | null = null;

export function connectToServer(): BotSocket {
  if (socket?.connected) return socket;

  console.log(
    `[connection] Connecting to game server at ${config.GAME_SERVER_URL}...`,
  );

  socket = io(config.GAME_SERVER_URL, {
    path: "/bot-service",
    auth: {
      secret: config.BOT_SERVICE_SECRET,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
    transports: ["websocket"],
  }) as BotSocket;

  // ── Connection lifecycle ──

  socket.on("connect", () => {
    console.log(`[connection] Connected to game server (id=${socket!.id})`);
    socket!.emit("bot_service_ready", {
      maxBots: config.MAX_CONCURRENT_BOTS,
    });
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[connection] Disconnected from game server: ${reason}`);
  });

  socket.on("connect_error", (err) => {
    console.error(`[connection] Connection error: ${err.message}`);
  });

  // ── Bot lifecycle events ──

  socket.on("bot_spawn", (data: BotSpawnRequest) => {
    botManager.spawnBot(
      data.matchId,
      data.botId,
      data.difficulty,
      data.playerIndex,
      data.color,
      data.name,
    );
  });

  socket.on("bot_despawn", (data: BotDespawnRequest) => {
    botManager.despawnBot(data.botId);
  });

  // ── Match state events ──

  socket.on("bot_match_started", (data: BotMatchStarted) => {
    botManager.setMatchState(data.matchId, {
      matchId: data.matchId,
      board: data.board,
      blockedCells: data.blockedCells,
      currentTurn: data.currentTurn,
      config: data.config,
      players: data.players,
      status: "active",
    });

    // Check if a bot goes first
    botManager.scheduleMoveIfNeeded(data.matchId);
  });

  socket.on("bot_state_update", (data: BotStateUpdate) => {
    botManager.updateBoard(data.matchId, data.board, data.currentTurn);

    // Check if next player is a bot
    botManager.scheduleMoveIfNeeded(data.matchId);
  });

  socket.on("bot_round_started", (data: BotRoundStarted) => {
    botManager.updateRoundState(
      data.matchId,
      data.board,
      data.blockedCells,
      data.currentTurn,
    );

    // Check if a bot starts the new round
    botManager.scheduleMoveIfNeeded(data.matchId);
  });

  socket.on("bot_match_ended", (data: BotMatchEnded) => {
    botManager.despawnMatchBots(data.matchId);
  });

  // ── Wire bot move callback ──

  botManager.setMoveCallback((matchId, botId, col) => {
    if (!socket?.connected) {
      console.error(
        `[connection] Cannot submit move — not connected to server`,
      );
      return;
    }
    socket.emit("bot_move", { matchId, botId, col });
  });

  return socket;
}

export function disconnectFromServer(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
