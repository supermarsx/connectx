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

// Lua script: atomically look up userId from socket, compare, and clean up
const REMOVE_CONN_LUA = `
local socketKey = KEYS[1]
local userId = redis.call('GET', socketKey)
redis.call('DEL', socketKey)
if not userId then return 0 end
local userKey    = KEYS[2] .. userId
local stateKey   = KEYS[3] .. userId
local onlineKey  = KEYS[4]
local currentSid = redis.call('GET', userKey)
if currentSid == ARGV[1] then
  redis.call('DEL', userKey)
  redis.call('DEL', stateKey)
  redis.call('SREM', onlineKey, userId)
end
return 1
`;

export async function removeConnection(socketId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (redis as any).eval(
      REMOVE_CONN_LUA,
      4,
      `${PREFIX}socket:${socketId}`,
      `${PREFIX}user:`,
      `${PREFIX}state:`,
      `${PREFIX}online`,
      socketId,
    );
  } catch {
    // Fallback for environments where EVAL is unavailable (e.g. test stubs)
    const userId = await redis.get(`${PREFIX}socket:${socketId}`);
    const pipeline = redis.pipeline();
    pipeline.del(`${PREFIX}socket:${socketId}`);
    if (userId) {
      const currentSocketId = await redis.get(`${PREFIX}user:${userId}`);
      if (currentSocketId === socketId) {
        pipeline.del(`${PREFIX}user:${userId}`);
        pipeline.del(`${PREFIX}state:${userId}`);
        pipeline.srem(`${PREFIX}online`, userId);
      }
    }
    await pipeline.exec();
  }
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
  const pipeline = redis.pipeline();
  pipeline.set(`${PREFIX}state:${userId}`, JSON.stringify(state), "EX", TTL);
  const socketId = await redis.get(`${PREFIX}user:${userId}`);
  if (socketId) {
    pipeline.expire(`${PREFIX}user:${userId}`, TTL);
    pipeline.expire(`${PREFIX}socket:${socketId}`, TTL);
  }
  await pipeline.exec();
}

export async function getPlayerState(
  userId: string,
): Promise<PlayerState | null> {
  const data = await redis.get(`${PREFIX}state:${userId}`);
  if (!data) return null;
  try {
    return JSON.parse(data) as PlayerState;
  } catch {
    return null;
  }
}

export async function getOnlineCount(): Promise<number> {
  return redis.scard(`${PREFIX}online`);
}
