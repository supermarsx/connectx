import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Redis before importing antiCheat
vi.mock("../db/redis.js", () => ({
  redis: {
    zadd: vi.fn().mockResolvedValue(0),
    zrangebyscore: vi.fn().mockResolvedValue([]),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue("OK"),
  },
}));

// Mock config
vi.mock("../config.js", () => ({
  config: {
    JWT_SECRET: "test-secret",
    REDIS_URL: "redis://localhost:6379",
    DB_PROVIDER: "sqlite",
  },
}));

import {
  validateMoveRate,
  validateTurnOrder,
  validateMoveInput,
} from "../game/antiCheat.js";
import { createBoard, dropPiece } from "../engine/board.js";
import type { OnlineMatch } from "../game/matchManager.js";

function makeMatch(overrides: Partial<OnlineMatch> = {}): OnlineMatch {
  return {
    matchId: "test-match",
    config: { mode: "classic", connectN: 4, totalRounds: 1, rows: 6, cols: 7 },
    players: [
      { userId: "user-a", name: "Alice", color: "#FF6FAF", isBot: false, playerIndex: 0 },
      { userId: "user-b", name: "Bob", color: "#64E0C6", isBot: false, playerIndex: 1 },
    ],
    board: createBoard(),
    blockedCells: Array.from({ length: 6 }, () => Array(7).fill(false)),
    currentTurnIndex: 0,
    round: 1,
    scores: { "user-a": 0, "user-b": 0 },
    status: "active",
    moveHistory: [],
    turnStartedAt: Date.now(),
    turnTimeoutMs: 30000,
    disconnectedPlayers: new Set(),
    rematchVotes: new Set(),
    createdAt: Date.now(),
    ...overrides,
  } as OnlineMatch;
}

// ── validateMoveRate ──

describe("validateMoveRate", () => {
  beforeEach(() => {
    // Clear the internal Map by using a unique userId per test
    vi.clearAllMocks();
  });

  it("allows 2 moves per second", async () => {
    const userId = `rate-test-${Date.now()}-a`;
    const now = 100000;
    expect(await validateMoveRate(userId, now)).toBe(true);
    expect(await validateMoveRate(userId, now + 100)).toBe(true);
  });

  it("rejects 3rd move within 1 second", async () => {
    const userId = `rate-test-${Date.now()}-b`;
    const now = 200000;
    expect(await validateMoveRate(userId, now)).toBe(true);
    expect(await validateMoveRate(userId, now + 200)).toBe(true);
    expect(await validateMoveRate(userId, now + 400)).toBe(false);
  });

  it("allows moves after the window expires", async () => {
    const userId = `rate-test-${Date.now()}-c`;
    const now = 300000;
    expect(await validateMoveRate(userId, now)).toBe(true);
    expect(await validateMoveRate(userId, now + 100)).toBe(true);
    // 3rd move after window expires (1001ms later)
    expect(await validateMoveRate(userId, now + 1001)).toBe(true);
  });
});

// ── validateTurnOrder ──

describe("validateTurnOrder", () => {
  it("returns true for the correct player", () => {
    const match = makeMatch({ currentTurnIndex: 0 });
    expect(validateTurnOrder(match, "user-a")).toBe(true);
  });

  it("returns false for the wrong player", () => {
    const match = makeMatch({ currentTurnIndex: 0 });
    expect(validateTurnOrder(match, "user-b")).toBe(false);
  });

  it("works for second player's turn", () => {
    const match = makeMatch({ currentTurnIndex: 1 });
    expect(validateTurnOrder(match, "user-b")).toBe(true);
    expect(validateTurnOrder(match, "user-a")).toBe(false);
  });
});

// ── validateMoveInput ──

describe("validateMoveInput", () => {
  it("accepts valid column", () => {
    const match = makeMatch();
    expect(validateMoveInput(0, match)).toBe(true);
    expect(validateMoveInput(6, match)).toBe(true);
    expect(validateMoveInput(3, match)).toBe(true);
  });

  it("rejects non-integer column", () => {
    const match = makeMatch();
    expect(validateMoveInput(1.5, match)).toBe(false);
    expect(validateMoveInput(NaN, match)).toBe(false);
    expect(validateMoveInput(Infinity, match)).toBe(false);
  });

  it("rejects negative column", () => {
    const match = makeMatch();
    expect(validateMoveInput(-1, match)).toBe(false);
  });

  it("rejects out-of-bounds column", () => {
    const match = makeMatch();
    expect(validateMoveInput(7, match)).toBe(false);
    expect(validateMoveInput(100, match)).toBe(false);
  });

  it("rejects a full column", () => {
    let board = createBoard();
    for (let i = 0; i < 6; i++) {
      board = dropPiece(board, 2, 1)!.board;
    }
    const match = makeMatch({ board });
    expect(validateMoveInput(2, match)).toBe(false);
  });
});
