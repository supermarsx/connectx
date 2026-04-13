import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import * as discoveryService from "../discovery/discoveryService.js";
import type { RoomInfo } from "../discovery/discoveryService.js";
import { moderationService } from "../moderation/moderationService.js";

export interface RoomPlayer {
  userId: string;
  name: string;
  color: string;
  isReady: boolean;
}

export interface RoomConfig {
  mode: "classic" | "fullboard";
  connectN: number;
  totalRounds: number;
  rows: number;
  cols: number;
  maxPlayers: number;
  isPublic: boolean;
  name: string;
}

export interface Room {
  roomId: string;
  name: string;
  hostId: string;
  players: RoomPlayer[];
  config: RoomConfig;
  inviteCode: string;
  isPublic: boolean;
  createdAt: number;
  status: "waiting" | "starting" | "inGame";
}

export interface CreateRoomOptions {
  name: string;
  maxPlayers: 2 | 3 | 4;
  mode: "classic" | "fullboard";
  connectN: 4 | 5 | 6;
  isPublic: boolean;
  totalRounds: number;
}

const DEFAULT_COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#EAB308"];

function generateInviteCode(): string {
  const num = crypto.randomBytes(4).readUInt32BE(0);
  return num.toString(36).slice(0, 6).toUpperCase().padStart(6, "0");
}

function getBoardSize(
  mode: string,
  connectN: number,
): { rows: number; cols: number } {
  if (mode === "fullboard") {
    return { rows: connectN + 2, cols: connectN + 3 };
  }
  return { rows: 6, cols: 7 };
}

export class LobbyManager {
  private rooms = new Map<string, Room>();
  private inviteCodeIndex = new Map<string, string>();

  createRoom(
    hostId: string,
    hostName: string,
    options: CreateRoomOptions,
  ): Room {
    const roomId = uuidv4();
    const inviteCode = generateInviteCode();
    const { rows, cols } = getBoardSize(options.mode, options.connectN);

    const room: Room = {
      roomId,
      name: options.name,
      hostId,
      players: [
        {
          userId: hostId,
          name: hostName,
          color: DEFAULT_COLORS[0],
          isReady: false,
        },
      ],
      config: {
        mode: options.mode,
        connectN: options.connectN,
        totalRounds: options.totalRounds,
        rows,
        cols,
        maxPlayers: options.maxPlayers,
        isPublic: options.isPublic,
        name: options.name,
      },
      inviteCode,
      isPublic: options.isPublic,
      createdAt: Date.now(),
      status: "waiting",
    };

    this.rooms.set(roomId, room);
    this.inviteCodeIndex.set(inviteCode, roomId);

    this.syncToDiscovery(room).catch((err) =>
      console.error("[lobby] Failed to sync room to discovery:", err),
    );

    return room;
  }

  async joinRoom(
    roomId: string,
    userId: string,
    userName: string,
    inviteCode?: string,
  ): Promise<Room> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "waiting")
      throw new Error("Room is not accepting players");
    if (room.players.length >= room.config.maxPlayers)
      throw new Error("Room is full");
    if (!room.isPublic && room.inviteCode !== inviteCode)
      throw new Error("Invalid invite code");
    if (room.players.some((p) => p.userId === userId))
      throw new Error("Already in this room");

    // Check block relationships with all existing room members
    for (const member of room.players) {
      const blocked = await moderationService.isBlocked(userId, member.userId)
        || await moderationService.isBlocked(member.userId, userId);
      if (blocked) {
        throw new Error("Cannot join: a block relationship exists with a player in this room");
      }
    }

    const usedColors = new Set(room.players.map((p) => p.color));
    const availableColor =
      DEFAULT_COLORS.find((c) => !usedColors.has(c)) || DEFAULT_COLORS[0];

    room.players.push({
      userId,
      name: userName,
      color: availableColor,
      isReady: false,
    });

    this.syncToDiscovery(room).catch((err) =>
      console.error("[lobby] Failed to sync room to discovery:", err),
    );

    return room;
  }

  leaveRoom(roomId: string, userId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter((p) => p.userId !== userId);

    if (room.players.length === 0) {
      this.destroyRoom(roomId);
      return null;
    }

    if (room.hostId === userId) {
      room.hostId = room.players[0].userId;
    }

    this.syncToDiscovery(room).catch((err) =>
      console.error("[lobby] Failed to sync room to discovery:", err),
    );

    return room;
  }

  selectColor(
    roomId: string,
    userId: string,
    color: string,
  ): { success: boolean; availableColors?: string[] } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false };

    const player = room.players.find((p) => p.userId === userId);
    if (!player) return { success: false };

    const takenColors = room.players
      .filter((p) => p.userId !== userId)
      .map((p) => p.color);

    if (takenColors.includes(color)) {
      const availableColors = DEFAULT_COLORS.filter(
        (c) => !takenColors.includes(c),
      );
      return { success: false, availableColors };
    }

    player.color = color;
    return { success: true };
  }

  startMatch(roomId: string, userId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== userId)
      throw new Error("Only the host can start the match");
    if (room.players.length < 2)
      throw new Error("Need at least 2 players to start");
    if (room.status !== "waiting") throw new Error("Match already started");

    room.status = "starting";
    return room;
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) ?? null;
  }

  getRoomByInviteCode(code: string): Room | null {
    const roomId = this.inviteCodeIndex.get(code);
    if (!roomId) return null;
    return this.rooms.get(roomId) ?? null;
  }

  private destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.inviteCodeIndex.delete(room.inviteCode);
    }
    this.rooms.delete(roomId);
    discoveryService.removeRoom(roomId).catch((err) =>
      console.error("[lobby] Failed to remove room from discovery:", err),
    );
  }

  private async syncToDiscovery(room: Room): Promise<void> {
    const info: RoomInfo = {
      roomId: room.roomId,
      name: room.name,
      hostId: room.hostId,
      hostName:
        room.players.find((p) => p.userId === room.hostId)?.name ?? "Unknown",
      playerCount: room.players.length,
      maxPlayers: room.config.maxPlayers,
      mode: room.config.mode,
      connectN: room.config.connectN,
      isPublic: room.isPublic,
      inviteCode: room.inviteCode,
      createdAt: room.createdAt,
    };

    if (room.isPublic) {
      await discoveryService.registerRoom(info);
    }
  }
}

export const lobbyManager = new LobbyManager();
