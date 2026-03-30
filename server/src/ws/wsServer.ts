import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInfo,
  RoomConfig as ProtocolRoomConfig,
} from "../shared/protocol.js";
import { socketAuthMiddleware } from "../auth/authMiddleware.js";
import { config } from "../config.js";
import { registerHandlers } from "./handlers.js";
import * as connectionManager from "./connectionManager.js";
import { matchmakerService } from "../matchmaker/matchmakerService.js";
import { lobbyManager } from "../matchmaker/lobbyManager.js";
import { initGameCore, handlePlayerDisconnect, handlePlayerReconnect, handleMatchStart as gameCoreMatchStart } from "../game/gameCore.js";
import { matchManager } from "../game/matchManager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: TypedServer;

export function createSocketServer(httpServer: HttpServer): TypedServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN,
      credentials: true,
    },
  });

  initGameCore(io);

  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    const user = socket.data.user as { id: string; username: string };
    console.log(
      `[ws] Connected: ${user.username} (${user.id}) socket=${socket.id}`,
    );

    await connectionManager.registerConnection(socket.id, user.id);

    registerHandlers(socket, io);

    // Auto-reconnect: if user has an active match, rejoin it
    const existingMatch = matchManager.getMatchByUserId(user.id);
    if (existingMatch && existingMatch.status !== "finished") {
      await handlePlayerReconnect(io, socket, existingMatch.matchId, user.id);
    }

    socket.on("disconnect", async () => {
      console.log(`[ws] Disconnected: ${user.username} (${user.id})`);

      matchmakerService.leaveQueue(user.id);

      const state = await connectionManager.getPlayerState(user.id);

      if (state?.roomId) {
        const room = lobbyManager.leaveRoom(state.roomId, user.id);
        if (room) {
          const players: PlayerInfo[] = room.players.map((p) => ({
            id: p.userId,
            name: p.name,
            color: p.color,
            isBot: false,
            rating: 1000,
          }));
          const roomConfig: ProtocolRoomConfig = {
            mode: room.config.mode,
            connectN: room.config.connectN,
            totalRounds: room.config.totalRounds,
            rows: room.config.rows,
            cols: room.config.cols,
            maxPlayers: room.config.maxPlayers,
            isPublic: room.isPublic,
            name: room.name,
          };
          io.to(room.roomId).emit("room_update", {
            roomId: room.roomId,
            players,
            hostId: room.hostId,
            config: roomConfig,
          });
        } else {
          io.to(state.roomId).emit("room_closed", {
            reason: "Host disconnected",
          });
        }
      }

      if (state?.matchId) {
        handlePlayerDisconnect(io, state.matchId, user.id);
      }

      await connectionManager.removeConnection(socket.id);
    });
  });

  // Wire up matchmaker callback → emit match_found to matched players
  matchmakerService.setMatchReadyCallback(
    async (matchId, players, matchConfig) => {
      for (const player of players) {
        if (player.isBot) continue;
        const socketId = await connectionManager.getSocketId(player.userId);
        if (socketId) {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            playerSocket.join(matchId);
            await connectionManager.setPlayerState(player.userId, {
              status: "inMatch",
              matchId,
            });
          }
        }
      }

      const playerInfos: PlayerInfo[] = players.map((p) => ({
        id: p.userId,
        name: p.name,
        color: p.color,
        isBot: p.isBot,
        rating: 1000,
      }));

      io.to(matchId).emit("match_found", {
        matchId,
        players: playerInfos,
        config: matchConfig,
      });

      // Create the actual match and start the game
      gameCoreMatchStart(io, matchId, players, matchConfig);
      for (const player of players) {
        if (player.isBot) continue;
        await connectionManager.setPlayerState(player.userId, {
          status: "inMatch",
          matchId,
        });
      }

      console.log(
        `[ws] Match formed: ${matchId} with ${players.length} players`,
      );
    },
  );

  return io;
}

export function getIO(): TypedServer {
  if (!io) throw new Error("Socket.IO server not initialized");
  return io;
}
