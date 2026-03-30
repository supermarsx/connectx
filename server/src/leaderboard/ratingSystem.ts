/**
 * Simplified Glicko-like rating system for ConnectX.
 * Pure computation — no I/O.
 */

export interface RatingPlayer {
  userId: string;
  rating: number;
  ratingDeviation: number;
  gamesPlayed: number;
}

export interface MatchResult {
  winnerId: string | null;
  isDraw: boolean;
  playerIds: string[];
}

export interface RatingChange {
  userId: string;
  oldRating: number;
  newRating: number;
  ratingChange: number;
}

const RATING_FLOOR = 100;

export function calculateRatingChanges(
  players: RatingPlayer[],
  result: MatchResult,
): RatingChange[] {
  if (players.length < 2) return [];

  return players.map((player) => {
    const K = player.gamesPlayed < 30 ? 32 : 16;
    const opponents = players.filter((p) => p.userId !== player.userId);

    // Expected score (ELO formula, averaged across opponents)
    let expectedScore = 0;
    for (const opp of opponents) {
      const ratingDiff = opp.rating - player.rating;
      expectedScore += 1 / (1 + Math.pow(10, ratingDiff / 400));
    }
    expectedScore /= opponents.length;

    // Actual score
    let actualScore: number;
    if (result.isDraw) {
      actualScore = 0.5;
    } else if (result.winnerId === player.userId) {
      actualScore = 1;
    } else {
      actualScore = 0;
    }

    const rawChange = Math.round(K * (actualScore - expectedScore));
    const newRating = Math.max(RATING_FLOOR, player.rating + rawChange);

    return {
      userId: player.userId,
      oldRating: player.rating,
      newRating,
      ratingChange: newRating - player.rating,
    };
  });
}
