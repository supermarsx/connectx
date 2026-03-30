import { redis } from "../db/redis.js";

const PREFIX = "connectx:conn:";
const TTL = 3600; // 1 hour

export interface PlayerState {
  status: "idle" | "inQueue" | "inRoom" | "inMatch";
  roomId?: string;
  matchId?: string;
}

export async function registerConnection(
  socketId: string,
  userId: string,
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(`${PREFIX}socket:${socketId}`, userId, "EX", TTL);
  pipeline.set(`${PREFIX}user:${userId}`, socketId, "EX", TTL);
  pipeline.set(
    `${PREFIX}state:${userId}`,
    JSON.stringify({ status: "idle" } satisfies PlayerState),
    "EX",
    TTL,
  );
  pipeline.sadd(`${PREFIX}online`, userId);
  await pipeline.exec();
}

export async function removeConnection(socketId: string): Promise<void> {
  const userId = await redis.get(`${PREFIX}socket:${socketId}`);
  const pipeline = redis.pipeline();
  pipeline.del(`${PREFIX}socket:${socketId}`);
  if (userId) {
    pipeline.del(`${PREFIX}user:${userId}`);
    pipeline.del(`${PREFIX}state:${userId}`);
    pipeline.srem(`${PREFIX}online`, userId);
  }
  await pipeline.exec();
}

export async function getSocketId(userId: string): Promise<string | null> {
  return redis.get(`${PREFIX}user:${userId}`);
}

export async function getUserId(socketId: string): Promise<string | null> {
  return redis.get(`${PREFIX}socket:${socketId}`);
}

export async function setPlayerState(
  userId: string,
  state: PlayerState,
): Promise<void> {
  await redis.set(`${PREFIX}state:${userId}`, JSON.stringify(state), "EX", TTL);
}

export async function getPlayerState(
  userId: string,
): Promise<PlayerState | null> {
  const data = await redis.get(`${PREFIX}state:${userId}`);
  if (!data) return null;
  return JSON.parse(data) as PlayerState;
}

export async function getOnlineCount(): Promise<number> {
  return redis.scard(`${PREFIX}online`);
}
