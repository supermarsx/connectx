import { describe, it, expect } from "vitest";
import {
  calculateRatingChanges,
  type RatingPlayer,
  type MatchResult,
} from "../leaderboard/ratingSystem.js";

function makePlayer(overrides: Partial<RatingPlayer> = {}): RatingPlayer {
  return {
    userId: "player-1",
    rating: 1500,
    ratingDeviation: 350,
    gamesPlayed: 50,
    ...overrides,
  };
}

// ── Basic Rating Changes ──

describe("calculateRatingChanges", () => {
  it("winner gains rating, loser loses rating", () => {
    const players: RatingPlayer[] = [
      makePlayer({ userId: "winner", rating: 1500 }),
      makePlayer({ userId: "loser", rating: 1500 }),
    ];
    const result: MatchResult = {
      winnerId: "winner",
      isDraw: false,
      playerIds: ["winner", "loser"],
    };

    const changes = calculateRatingChanges(players, result);
    const winnerChange = changes.find((c) => c.userId === "winner")!;
    const loserChange = changes.find((c) => c.userId === "loser")!;

    expect(winnerChange.ratingChange).toBeGreaterThan(0);
    expect(loserChange.ratingChange).toBeLessThan(0);
    expect(winnerChange.newRating).toBeGreaterThan(1500);
    expect(loserChange.newRating).toBeLessThan(1500);
  });

  it("higher-rated player gains less for winning against lower-rated", () => {
    const equalPlayers: RatingPlayer[] = [
      makePlayer({ userId: "a", rating: 1500 }),
      makePlayer({ userId: "b", rating: 1500 }),
    ];
    const unequalPlayers: RatingPlayer[] = [
      makePlayer({ userId: "a", rating: 1800 }),
      makePlayer({ userId: "b", rating: 1200 }),
    ];
    const winResult: MatchResult = {
      winnerId: "a",
      isDraw: false,
      playerIds: ["a", "b"],
    };

    const equalChanges = calculateRatingChanges(equalPlayers, winResult);
    const unequalChanges = calculateRatingChanges(unequalPlayers, winResult);

    const equalGain = equalChanges.find((c) => c.userId === "a")!.ratingChange;
    const unequalGain = unequalChanges.find((c) => c.userId === "a")!.ratingChange;

    // Higher rated player gains less when beating a lower rated player
    expect(unequalGain).toBeLessThan(equalGain);
  });

  it("new players (< 30 games) have higher K factor", () => {
    const newPlayer: RatingPlayer[] = [
      makePlayer({ userId: "new", rating: 1500, gamesPlayed: 10 }),
      makePlayer({ userId: "vet", rating: 1500, gamesPlayed: 100 }),
    ];
    const vetPlayers: RatingPlayer[] = [
      makePlayer({ userId: "vet1", rating: 1500, gamesPlayed: 100 }),
      makePlayer({ userId: "vet2", rating: 1500, gamesPlayed: 100 }),
    ];

    const newResult: MatchResult = {
      winnerId: "new",
      isDraw: false,
      playerIds: ["new", "vet"],
    };
    const vetResult: MatchResult = {
      winnerId: "vet1",
      isDraw: false,
      playerIds: ["vet1", "vet2"],
    };

    const newChanges = calculateRatingChanges(newPlayer, newResult);
    const vetChanges = calculateRatingChanges(vetPlayers, vetResult);

    const newGain = newChanges.find((c) => c.userId === "new")!.ratingChange;
    const vetGain = vetChanges.find((c) => c.userId === "vet1")!.ratingChange;

    // K=32 for new, K=16 for veteran — new player gets bigger swing
    expect(newGain).toBeGreaterThan(vetGain);
  });

  it("draw results in small rating changes", () => {
    const players: RatingPlayer[] = [
      makePlayer({ userId: "a", rating: 1500 }),
      makePlayer({ userId: "b", rating: 1500 }),
    ];
    const drawResult: MatchResult = {
      winnerId: null,
      isDraw: true,
      playerIds: ["a", "b"],
    };

    const changes = calculateRatingChanges(players, drawResult);
    for (const change of changes) {
      expect(Math.abs(change.ratingChange)).toBeLessThanOrEqual(1);
    }
  });

  it("rating changes are symmetric (total sums to ~0)", () => {
    const players: RatingPlayer[] = [
      makePlayer({ userId: "winner", rating: 1600 }),
      makePlayer({ userId: "loser", rating: 1400 }),
    ];
    const result: MatchResult = {
      winnerId: "winner",
      isDraw: false,
      playerIds: ["winner", "loser"],
    };

    const changes = calculateRatingChanges(players, result);
    const totalChange = changes.reduce((sum, c) => sum + c.ratingChange, 0);
    // Due to rounding + floor, allow small deviation
    expect(Math.abs(totalChange)).toBeLessThanOrEqual(2);
  });

  it("rating never drops below RATING_FLOOR (100)", () => {
    const players: RatingPlayer[] = [
      makePlayer({ userId: "winner", rating: 1500 }),
      makePlayer({ userId: "loser", rating: 100 }),
    ];
    const result: MatchResult = {
      winnerId: "winner",
      isDraw: false,
      playerIds: ["winner", "loser"],
    };

    const changes = calculateRatingChanges(players, result);
    const loserChange = changes.find((c) => c.userId === "loser")!;
    expect(loserChange.newRating).toBeGreaterThanOrEqual(100);
  });

  it("returns empty array for fewer than 2 players", () => {
    const players: RatingPlayer[] = [makePlayer({ userId: "solo" })];
    const result: MatchResult = {
      winnerId: "solo",
      isDraw: false,
      playerIds: ["solo"],
    };

    expect(calculateRatingChanges(players, result)).toEqual([]);
  });

  it("handles 3+ player games", () => {
    const players: RatingPlayer[] = [
      makePlayer({ userId: "a", rating: 1500 }),
      makePlayer({ userId: "b", rating: 1500 }),
      makePlayer({ userId: "c", rating: 1500 }),
    ];
    const result: MatchResult = {
      winnerId: "a",
      isDraw: false,
      playerIds: ["a", "b", "c"],
    };

    const changes = calculateRatingChanges(players, result);
    expect(changes).toHaveLength(3);
    const winnerChange = changes.find((c) => c.userId === "a")!;
    expect(winnerChange.ratingChange).toBeGreaterThan(0);
  });
});
