import { describe, it, expect, beforeEach, vi } from "vitest";
import { BotManager } from "../botManager.js";

describe("BotManager", () => {
  let manager: BotManager;

  beforeEach(() => {
    manager = new BotManager();
  });

  describe("spawnBot / despawnBot", () => {
    it("tracks spawned bots", () => {
      manager.spawnBot("match-1", "bot-1", "easy", 0, "#FF0000", "Bot Easy");
      expect(manager.activeBotCount).toBe(1);
      expect(manager.getBotsInMatch("match-1")).toHaveLength(1);
    });

    it("despawns individual bot", () => {
      manager.spawnBot("match-1", "bot-1", "easy", 0, "#FF0000", "Bot Easy");
      manager.despawnBot("bot-1");
      expect(manager.activeBotCount).toBe(0);
    });

    it("despawns all bots in a match", () => {
      manager.spawnBot("match-1", "bot-1", "easy", 0, "#FF0000", "Bot 1");
      manager.spawnBot("match-1", "bot-2", "medium", 1, "#00FF00", "Bot 2");
      manager.spawnBot("match-2", "bot-3", "hard", 0, "#0000FF", "Bot 3");

      manager.despawnMatchBots("match-1");
      expect(manager.activeBotCount).toBe(1);
      expect(manager.getBotsInMatch("match-1")).toHaveLength(0);
      expect(manager.getBotsInMatch("match-2")).toHaveLength(1);
    });
  });

  describe("match state tracking", () => {
    it("stores and updates match state", () => {
      const board = Array.from({ length: 6 }, () => Array(7).fill(0));
      const blockedCells = Array.from({ length: 6 }, () =>
        Array(7).fill(false),
      );

      manager.setMatchState("match-1", {
        matchId: "match-1",
        board,
        blockedCells,
        currentTurn: "player-1",
        config: { rows: 6, cols: 7, connectN: 4 },
        players: [
          { userId: "player-1", name: "Player 1", isBot: false, playerIndex: 0 },
          { userId: "bot-1", name: "Bot", isBot: true, playerIndex: 1 },
        ],
        status: "active",
      });

      expect(manager.activeMatchCount).toBe(1);

      // Update board
      const newBoard = board.map((r) => [...r]);
      newBoard[5][3] = 1;
      manager.updateBoard("match-1", newBoard, "bot-1");
    });
  });

  describe("scheduleMoveIfNeeded", () => {
    it("schedules move when bot is current player", () => {
      vi.useFakeTimers();
      const moveCb = vi.fn();
      manager.setMoveCallback(moveCb);

      manager.spawnBot("match-1", "bot-1", "medium", 1, "#00FF00", "Bot");

      const board = Array.from({ length: 6 }, () => Array(7).fill(0));
      const blockedCells = Array.from({ length: 6 }, () =>
        Array(7).fill(false),
      );

      manager.setMatchState("match-1", {
        matchId: "match-1",
        board,
        blockedCells,
        currentTurn: "bot-1",
        config: { rows: 6, cols: 7, connectN: 4 },
        players: [
          { userId: "player-1", name: "Player 1", isBot: false, playerIndex: 0 },
          { userId: "bot-1", name: "Bot", isBot: true, playerIndex: 1 },
        ],
        status: "active",
      });

      manager.scheduleMoveIfNeeded("match-1");

      // Fast-forward past max delay
      vi.advanceTimersByTime(2000);

      expect(moveCb).toHaveBeenCalledWith(
        "match-1",
        "bot-1",
        expect.any(Number),
      );

      vi.useRealTimers();
    });

    it("does not schedule when human is current player", () => {
      vi.useFakeTimers();
      const moveCb = vi.fn();
      manager.setMoveCallback(moveCb);

      manager.spawnBot("match-1", "bot-1", "easy", 1, "#00FF00", "Bot");

      const board = Array.from({ length: 6 }, () => Array(7).fill(0));
      const blockedCells = Array.from({ length: 6 }, () =>
        Array(7).fill(false),
      );

      manager.setMatchState("match-1", {
        matchId: "match-1",
        board,
        blockedCells,
        currentTurn: "player-1", // Human's turn
        config: { rows: 6, cols: 7, connectN: 4 },
        players: [
          { userId: "player-1", name: "Player 1", isBot: false, playerIndex: 0 },
          { userId: "bot-1", name: "Bot", isBot: true, playerIndex: 1 },
        ],
        status: "active",
      });

      manager.scheduleMoveIfNeeded("match-1");
      vi.advanceTimersByTime(2000);
      expect(moveCb).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("prevents duplicate scheduling via inflight set", () => {
      vi.useFakeTimers();
      const moveCb = vi.fn();
      manager.setMoveCallback(moveCb);

      manager.spawnBot("match-1", "bot-1", "easy", 1, "#00FF00", "Bot");

      const board = Array.from({ length: 6 }, () => Array(7).fill(0));
      const blockedCells = Array.from({ length: 6 }, () =>
        Array(7).fill(false),
      );

      manager.setMatchState("match-1", {
        matchId: "match-1",
        board,
        blockedCells,
        currentTurn: "bot-1",
        config: { rows: 6, cols: 7, connectN: 4 },
        players: [
          { userId: "player-1", name: "Player 1", isBot: false, playerIndex: 0 },
          { userId: "bot-1", name: "Bot", isBot: true, playerIndex: 1 },
        ],
        status: "active",
      });

      // Schedule twice rapidly
      manager.scheduleMoveIfNeeded("match-1");
      manager.scheduleMoveIfNeeded("match-1");

      vi.advanceTimersByTime(2000);

      // Should only fire once
      expect(moveCb).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});
