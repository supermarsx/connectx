import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInfo,
  RoomConfig as ProtocolRoomConfig,
} from "../shared/protocol.js";
import { lobbyManager } from "../matchmaker/lobbyManager.js";
import type { Room } from "../matchmaker/lobbyManager.js";
import { matchmakerService } from "../matchmaker/matchmakerService.js";
import * as connectionManager from "./connectionManager.js";
import * as gameCore from "../game/gameCore.js";
import type { MatchedPlayerInput } from "../game/matchManager.js";
import { query } from "../db/provider.js";
import { revalidateToken } from "../auth/authMiddleware.js";
import { z } from "zod";

const joinQueueSchema = z.object({
  mode: z.enum(["classic", "fullboard"]),
  connectN: z.union([z.literal(4), z.literal(5), z.literal(6)]),
  allowBots: z.boolean(),
});

const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
  maxPlayers: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  mode: z.enum(["classic", "fullboard"]),
  connectN: z.union([z.literal(4), z.literal(5), z.literal(6)]),
  isPublic: z.boolean(),
  totalRounds: z.number().int().min(1).max(10),
});

const VALID_EMOTE_IDS = new Set([
  "gg", "wp", "gl", "hf", "nice", "oops", "wow", "think",
  "wave", "laugh", "cry", "angry", "heart", "fire", "thumbsup", "thumbsdown",
]);

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Emote rate limiting: max 3 per 5 seconds per user
const emoteRateMap = new Map<string, number[]>();
const EMOTE_RATE_LIMIT = 3;
const EMOTE_RATE_WINDOW = 5000;

export function clearEmoteRateLimit(userId: string): void {
  emoteRateMap.delete(userId);
}

function isEmoteRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = emoteRateMap.get(userId) ?? [];
  const recent = timestamps.filter(t => now - t < EMOTE_RATE_WINDOW);
  if (recent.length >= EMOTE_RATE_LIMIT) {
    emoteRateMap.set(userId, recent);
    return true;
  }
  recent.push(now);
  emoteRateMap.set(userId, recent);
  return false;
}

async function roomPlayersToPlayerInfo(room: Room): Promise<PlayerInfo[]> {
  return Promise.all(
    room.players.map(async (p) => {
      let rating = 1000;
      const res = await query<{ rating: number }>(
        "SELECT rating FROM users WHERE id = $1",
        [p.userId],
      );
      if (res.rows[0]) rating = res.rows[0].rating;
      return {
        id: p.userId,
        name: p.name,
        color: p.color,
        isBot: false,
        rating,
      };
    }),
  );
}

function roomToProtocolConfig(room: Room): ProtocolRoomConfig {
  return {
    mode: room.config.mode,
    connectN: room.config.connectN,
    totalRounds: room.config.totalRounds,
    rows: room.config.rows,
    cols: room.config.cols,
    maxPlayers: room.config.maxPlayers,
    isPublic: room.isPublic,
    name: room.name,
  };
}

/** Create an online match from a lobby room and emit match_started. */
export async function handleMatchStart(
  io: TypedServer,
  matchId: string,
  room: Room,
): Promise<void> {
  const players: MatchedPlayerInput[] = room.players.map((p) => ({
    userId: p.userId,
    name: p.name,
    color: p.color,
    isBot: false,
  }));

  const config = {
    mode: room.config.mode,
    connectN: room.config.connectN,
    totalRounds: room.config.totalRounds,
    rows: room.config.rows,
    cols: room.config.cols,
  };

  const match = gameCore.handleMatchStart(io, matchId, players, config);

  for (const player of match.players) {
    if (player.isBot) continue;
    await connectionManager.setPlayerState(player.userId, {
      status: "inMatch",
      matchId: match.matchId,
    });
  }
}

/** Validate the user is in a match and forward the move to gameCore. */
export async function handleSubmitMove(
  socket: TypedSocket,
  io: TypedServer,
  col: number,
): Promise<void> {
  const user = socket.data.user as
    | { id: string; username: string }
    | undefined;
  if (!user) return;

  // Re-validate auth token before processing critical move
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token || !revalidateToken(token)) {
    socket.emit("move_rejected", { reason: "Authentication expired" });
    socket.disconnect();
    return;
  }

  const state = await connectionManager.getPlayerState(user.id);
  const matchId = state?.matchId;
  if (!matchId) {
    socket.emit("move_rejected", { reason: "Not in a match" });
    return;
  }

  await gameCore.handleSubmitMove(io, socket, matchId, col);
}

export function registerHandlers(socket: TypedSocket, io: TypedServer): void {
  const user = socket.data.user as
    | { id: string; username: string }
    | undefined;
  if (!user) {
    socket.disconnect();
    return;
  }

  // ── Queue Handlers ──

  socket.on("join_queue", async (data: { mode: 'classic' | 'fullboard'; connectN: 4 | 5 | 6; allowBots: boolean }) => {
    try {
      const parsed = joinQueueSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit("error", { code: "QUEUE_JOIN_FAILED", message: "Invalid queue parameters" });
        return;
      }
      const { mode, connectN, allowBots } = parsed.data;

      let rating = 1200;
      const res = await query<{ rating: number }>(
        "SELECT rating FROM users WHERE id = $1",
        [user.id],
      );
      if (res.rows[0]) rating = res.rows[0].rating;

      const { position } = matchmakerService.joinQueue(
        user.id,
        user.username,
        { mode, connectN, allowBots },
        rating,
      );
      await connectionManager.setPlayerState(user.id, { status: "inQueue" });
      socket.emit("queue_joined", { position });
      console.log(
        `[ws] ${user.username} joined queue (position ${position})`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join queue";
      socket.emit("error", { code: "QUEUE_JOIN_FAILED", message });
    }
  });

  socket.on("leave_queue", async () => {
    try {
      matchmakerService.leaveQueue(user.id);
      await connectionManager.setPlayerState(user.id, { status: "idle" });
      console.log(`[ws] ${user.username} left queue`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to leave queue";
      socket.emit("error", { code: "QUEUE_LEAVE_FAILED", message });
    }
  });

  // ── Room Handlers ──

  socket.on("create_room", async (data: { name: string; maxPlayers: 2 | 3 | 4; mode: 'classic' | 'fullboard'; connectN: 4 | 5 | 6; isPublic: boolean; totalRounds: number }) => {
    try {
      const parsed = createRoomSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit("error", { code: "ROOM_CREATE_FAILED", message: "Invalid room parameters" });
        return;
      }
      const room = lobbyManager.createRoom(user.id, user.username, parsed.data);

      socket.join(room.roomId);
      await connectionManager.setPlayerState(user.id, {
        status: "inRoom",
        roomId: room.roomId,
      });

      socket.emit("room_created", {
        roomId: room.roomId,
        inviteCode: room.inviteCode,
      });

      console.log(`[ws] ${user.username} created room ${room.roomId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create room";
      socket.emit("error", { code: "ROOM_CREATE_FAILED", message });
    }
  });

  socket.on("join_room", async (data: { roomId: string; inviteCode?: string }) => {
    try {
      const room = await lobbyManager.joinRoom(
        data.roomId,
        user.id,
        user.username,
        data.inviteCode,
      );

      socket.join(room.roomId);
      await connectionManager.setPlayerState(user.id, {
        status: "inRoom",
        roomId: room.roomId,
      });

      io.to(room.roomId).emit("room_update", {
        roomId: room.roomId,
        players: await roomPlayersToPlayerInfo(room),
        hostId: room.hostId,
        config: roomToProtocolConfig(room),
      });

      console.log(`[ws] ${user.username} joined room ${room.roomId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join room";
      socket.emit("error", { code: "ROOM_JOIN_FAILED", message });
    }
  });

  socket.on("leave_room", async () => {
    try {
      const state = await connectionManager.getPlayerState(user.id);
      if (!state?.roomId) return;

      const roomId = state.roomId;
      const room = lobbyManager.leaveRoom(roomId, user.id);
      socket.leave(roomId);
      await connectionManager.setPlayerState(user.id, { status: "idle" });

      if (room) {
        io.to(room.roomId).emit("room_update", {
          roomId: room.roomId,
          players: await roomPlayersToPlayerInfo(room),
          hostId: room.hostId,
          config: roomToProtocolConfig(room),
        });
      } else {
        io.to(roomId).emit("room_closed", { reason: "All players left" });
      }

      console.log(`[ws] ${user.username} left room ${roomId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to leave room";
      socket.emit("error", { code: "ROOM_LEAVE_FAILED", message });
    }
  });

  socket.on("select_color", async (data: { color: string }) => {
    try {
      const state = await connectionManager.getPlayerState(user.id);
      if (!state?.roomId) {
        socket.emit("error", {
          code: "NOT_IN_ROOM",
          message: "You are not in a room",
        });
        return;
      }

      const result = lobbyManager.selectColor(
        state.roomId,
        user.id,
        data.color,
      );

      if (!result.success) {
        socket.emit("color_rejected", {
          reason: "Color is already taken",
          availableColors: result.availableColors ?? [],
        });
        return;
      }

      const room = lobbyManager.getRoom(state.roomId);
      if (room) {
        io.to(room.roomId).emit("room_update", {
          roomId: room.roomId,
          players: await roomPlayersToPlayerInfo(room),
          hostId: room.hostId,
          config: roomToProtocolConfig(room),
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to select color";
      socket.emit("error", { code: "COLOR_SELECT_FAILED", message });
    }
  });

  socket.on("room_start", async () => {
    try {
      const state = await connectionManager.getPlayerState(user.id);
      if (!state?.roomId) {
        socket.emit("error", {
          code: "NOT_IN_ROOM",
          message: "You are not in a room",
        });
        return;
      }

      const room = lobbyManager.startMatch(state.roomId, user.id);
      await handleMatchStart(io, state.roomId, room);

      console.log(
        `[ws] ${user.username} started match in room ${state.roomId}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start match";
      socket.emit("error", { code: "MATCH_START_FAILED", message });
    }
  });

  // ── Match Handlers ──

  socket.on("submit_move", async (data: { col: number }) => {
    const col = typeof data?.col === 'number' ? Math.floor(data.col) : NaN;
    if (!Number.isFinite(col) || col < 0) {
      socket.emit("move_rejected", { reason: "Invalid column" });
      return;
    }
    try {
      await handleSubmitMove(socket, io, col);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit move";
      socket.emit("error", { code: "MOVE_FAILED", message });
    }
  });

  socket.on("request_rematch", async () => {
    try {
      const state = await connectionManager.getPlayerState(user.id);
      const matchId = state?.matchId;
      if (!matchId) return;

      await gameCore.handleRematchRequest(io, socket, matchId, user.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Rematch request failed";
      socket.emit("error", { code: "REMATCH_FAILED", message });
    }
  });

  socket.on("chat_emote", async (data: { emoteId: string }) => {
    try {
      if (isEmoteRateLimited(user.id)) return;
      if (!data?.emoteId || typeof data.emoteId !== "string" || !VALID_EMOTE_IDS.has(data.emoteId)) return;

      const state = await connectionManager.getPlayerState(user.id);
      const channelId = state?.matchId ?? state?.roomId;
      if (!channelId) return;

      // Broadcast emote to other participants in the room/match
      socket.to(channelId).emit("chat_emote", {
        playerId: user.id,
        emoteId: data.emoteId,
      });
    } catch (err) {
      console.error("[ws] Error broadcasting emote:", err);
    }
  });
}
