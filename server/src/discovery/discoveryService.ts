import { redis } from "../db/redis.js";

const ROOM_PREFIX = "connectx:rooms:";
const PUBLIC_SET = "connectx:rooms:public";

export interface RoomInfo {
  roomId: string;
  name: string;
  hostId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  mode: "classic" | "fullboard";
  connectN: number;
  isPublic: boolean;
  inviteCode: string;
  createdAt: number;
}

export async function registerRoom(room: RoomInfo): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(`${ROOM_PREFIX}${room.roomId}`, JSON.stringify(room));
  if (room.isPublic) {
    pipeline.zadd(PUBLIC_SET, room.createdAt, room.roomId);
  }
  await pipeline.exec();
}

export async function removeRoom(roomId: string): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.del(`${ROOM_PREFIX}${roomId}`);
  pipeline.zrem(PUBLIC_SET, roomId);
  await pipeline.exec();
}

export async function updateRoom(
  roomId: string,
  updates: Partial<RoomInfo>,
): Promise<void> {
  const existing = await getRoom(roomId);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await redis.set(`${ROOM_PREFIX}${roomId}`, JSON.stringify(updated));
}

export async function listPublicRooms(): Promise<RoomInfo[]> {
  const roomIds = await redis.zrangebyscore(PUBLIC_SET, "-inf", "+inf");
  if (roomIds.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of roomIds) {
    pipeline.get(`${ROOM_PREFIX}${id}`);
  }
  const results = await pipeline.exec();
  if (!results) return [];

  const rooms: RoomInfo[] = [];
  for (const [err, data] of results) {
    if (!err && data) {
      rooms.push(JSON.parse(data as string) as RoomInfo);
    }
  }
  return rooms;
}

export async function getRoom(roomId: string): Promise<RoomInfo | null> {
  const data = await redis.get(`${ROOM_PREFIX}${roomId}`);
  if (!data) return null;
  return JSON.parse(data) as RoomInfo;
}
