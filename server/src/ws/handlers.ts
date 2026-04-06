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

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function roomPlayersToPlayerInfo(room: Room): PlayerInfo[] {
  return room.players.map((p) => ({
    id: p.userId,
    name: p.name,
    color: p.color,
    isBot: false,
    rating: 1000,
  }));
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

  socket.on("join_queue", async (data) => {
    try {
      const { position } = matchmakerService.joinQueue(
        user.id,
        user.username,
        {
          mode: data.mode,
          connectN: data.connectN,
          allowBots: data.allowBots,
        },
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

  socket.on("create_room", async (data) => {
    try {
      const room = lobbyManager.createRoom(user.id, user.username, {
        name: data.name,
        maxPlayers: data.maxPlayers,
        mode: data.mode,
        connectN: data.connectN,
        isPublic: data.isPublic,
        totalRounds: data.totalRounds,
      });

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

  socket.on("join_room", async (data) => {
    try {
      const room = lobbyManager.joinRoom(
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
        players: roomPlayersToPlayerInfo(room),
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
          players: roomPlayersToPlayerInfo(room),
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

  socket.on("select_color", async (data) => {
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
          players: roomPlayersToPlayerInfo(room),
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

  socket.on("submit_move", async (data) => {
    try {
      await handleSubmitMove(socket, io, data.col);
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

  socket.on("chat_emote", async (data) => {
    try {
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
