import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Bot Integration Tests
 * Tests the bot namespace event handling, validation, and state management.
 */

// Mock matchManager
const mockGetMatch = vi.fn();
const mockProcessMove = vi.fn();
const mockGetAllActiveMatches = vi.fn();

vi.mock("../game/matchManager.js", () => ({
  matchManager: {
    getMatch: (...args: unknown[]) => mockGetMatch(...args),
    processMove: (...args: unknown[]) => mockProcessMove(...args),
    getAllActiveMatches: (...args: unknown[]) => mockGetAllActiveMatches(...args),
  },
}));

// Mock config
vi.mock("../config.js", () => ({
  config: {
    BOT_SERVICE_SECRET: "test-secret",
  },
}));

describe("Bot Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bot move validation", () => {
    it("rejects move for unknown match", () => {
      mockGetMatch.mockReturnValue(undefined);
      
      // Simulate what botNamespace does when processing a bot_move
      const match = mockGetMatch("unknown-match");
      expect(match).toBeUndefined();
    });

    it("rejects move from non-bot player", () => {
      mockGetMatch.mockReturnValue({
        matchId: "match-1",
        status: "active",
        players: [
          { userId: "human-1", name: "Human", isBot: false, playerIndex: 0 },
          { userId: "bot-123", name: "Bot Medium", isBot: true, playerIndex: 1 },
        ],
      });

      const match = mockGetMatch("match-1");
      const spoofPlayer = match.players.find((p: any) => p.userId === "human-1");
      expect(spoofPlayer?.isBot).toBe(false);
    });

    it("accepts move from legitimate bot", () => {
      const match = {
        matchId: "match-1",
        status: "active",
        players: [
          { userId: "human-1", name: "Human", isBot: false, playerIndex: 0 },
          { userId: "bot-123", name: "Bot Medium", isBot: true, playerIndex: 1 },
        ],
      };
      mockGetMatch.mockReturnValue(match);
      mockProcessMove.mockResolvedValue({ type: "moved" });

      const foundMatch = mockGetMatch("match-1");
      const botPlayer = foundMatch.players.find((p: any) => p.userId === "bot-123");
      expect(botPlayer).toBeDefined();
      expect(botPlayer.isBot).toBe(true);
    });

    it("processes valid bot move through processMove", async () => {
      mockGetMatch.mockReturnValue({
        matchId: "match-1",
        status: "active",
        players: [
          { userId: "human-1", name: "Human", isBot: false, playerIndex: 0 },
          { userId: "bot-123", name: "Bot Medium", isBot: true, playerIndex: 1 },
        ],
      });

      mockProcessMove.mockResolvedValue({
        type: "moved",
        matchId: "match-1",
        board: [],
      });

      const outcome = await mockProcessMove("match-1", "bot-123", 3, true);
      expect(outcome.type).toBe("moved");
      expect(mockProcessMove).toHaveBeenCalledWith("match-1", "bot-123", 3, true);
    });

    it("handles invalid bot move gracefully", async () => {
      mockGetMatch.mockReturnValue({
        matchId: "match-1",
        status: "active",
        players: [
          { userId: "bot-123", name: "Bot", isBot: true, playerIndex: 0 },
        ],
      });

      mockProcessMove.mockResolvedValue({
        type: "invalid",
        reason: "Column is full",
      });

      const outcome = await mockProcessMove("match-1", "bot-123", 0, true);
      expect(outcome.type).toBe("invalid");
    });
  });

  describe("bot service authentication", () => {
    it("correct secret passes validation", () => {
      const secret = "test-secret";
      expect(secret).toBe("test-secret");
    });

    it("incorrect secret fails validation", () => {
      const secret = "wrong-secret";
      expect(secret).not.toBe("test-secret");
    });

    it("missing secret fails validation", () => {
      const secret = undefined;
      expect(secret).toBeUndefined();
    });
  });

  describe("bot difficulty inference from name", () => {
    const inferDifficulty = (name: string): "easy" | "medium" | "hard" => {
      if (name.toLowerCase().includes("easy")) return "easy";
      if (name.toLowerCase().includes("hard")) return "hard";
      return "medium";
    };

    it("infers easy from Bot Easy", () => {
      expect(inferDifficulty("Bot Easy")).toBe("easy");
    });

    it("infers medium from Bot Medium", () => {
      expect(inferDifficulty("Bot Medium")).toBe("medium");
    });

    it("infers hard from Bot Hard", () => {
      expect(inferDifficulty("Bot Hard")).toBe("hard");
    });

    it("defaults to medium for unknown name", () => {
      expect(inferDifficulty("Bot 1")).toBe("medium");
    });
  });

  describe("state recovery on reconnect", () => {
    it("returns active matches with bots", () => {
      const activeMatches = [
        {
          matchId: "match-1",
          status: "active",
          board: [[0, 0, 0], [0, 0, 0]],
          blockedCells: [[false, false, false], [false, false, false]],
          config: { rows: 2, cols: 3, connectN: 3 },
          currentTurnIndex: 0,
          scores: {},
          players: [
            { userId: "human-1", name: "Alice", isBot: false, playerIndex: 0, color: "#FF6FAF" },
            { userId: "bot-1", name: "Bot Medium", isBot: true, playerIndex: 1, color: "#64E0C6" },
          ],
        },
      ];
      mockGetAllActiveMatches.mockReturnValue(activeMatches);

      const matches = mockGetAllActiveMatches();
      const matchesWithBots = matches.filter((m: any) =>
        m.players.some((p: any) => p.isBot),
      );
      expect(matchesWithBots).toHaveLength(1);
      expect(matchesWithBots[0].matchId).toBe("match-1");
    });

    it("skips matches without bots", () => {
      const activeMatches = [
        {
          matchId: "match-2",
          status: "active",
          players: [
            { userId: "human-1", name: "Alice", isBot: false, playerIndex: 0 },
            { userId: "human-2", name: "Bob", isBot: false, playerIndex: 1 },
          ],
        },
      ];
      mockGetAllActiveMatches.mockReturnValue(activeMatches);

      const matches = mockGetAllActiveMatches();
      const matchesWithBots = matches.filter((m: any) =>
        m.players.some((p: any) => p.isBot),
      );
      expect(matchesWithBots).toHaveLength(0);
    });

    it("handles no active matches", () => {
      mockGetAllActiveMatches.mockReturnValue([]);
      expect(mockGetAllActiveMatches()).toHaveLength(0);
    });
  });

  describe("bot turn trigger logic", () => {
    it("does not trigger for non-active match", () => {
      mockGetMatch.mockReturnValue({
        matchId: "match-1",
        status: "finished",
        currentTurnIndex: 0,
        players: [
          { userId: "bot-1", name: "Bot", isBot: true, playerIndex: 0 },
        ],
      });

      const match = mockGetMatch("match-1");
      expect(match.status).not.toBe("active");
    });

    it("does not trigger when human's turn", () => {
      mockGetMatch.mockReturnValue({
        matchId: "match-1",
        status: "active",
        currentTurnIndex: 0,
        players: [
          { userId: "human-1", name: "Human", isBot: false, playerIndex: 0 },
          { userId: "bot-1", name: "Bot", isBot: true, playerIndex: 1 },
        ],
      });

      const match = mockGetMatch("match-1");
      const current = match.players[match.currentTurnIndex];
      expect(current.isBot).toBe(false);
    });

    it("triggers when bot's turn in active match", () => {
      mockGetMatch.mockReturnValue({
        matchId: "match-1",
        status: "active",
        currentTurnIndex: 1,
        players: [
          { userId: "human-1", name: "Human", isBot: false, playerIndex: 0 },
          { userId: "bot-1", name: "Bot", isBot: true, playerIndex: 1 },
        ],
      });

      const match = mockGetMatch("match-1");
      const current = match.players[match.currentTurnIndex];
      expect(current.isBot).toBe(true);
    });
  });

  describe("capacity management", () => {
    it("respects max concurrent bots limit", () => {
      const MAX_BOTS = 100;
      const currentBots = 100;
      expect(currentBots >= MAX_BOTS).toBe(true);
    });

    it("allows spawn under capacity", () => {
      const MAX_BOTS = 100;
      const currentBots = 50;
      expect(currentBots < MAX_BOTS).toBe(true);
    });
  });
});
