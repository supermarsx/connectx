import { query } from "../db/pool.js";
import { calculateRatingChanges } from "./ratingSystem.js";
import type { RatingChange } from "./ratingSystem.js";
import type { MatchPlayer } from "../game/matchManager.js";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface PlayerStats {
  rating: number;
  ratingDeviation: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface MatchSummary {
  matchId: string;
  mode: string;
  connectN: number;
  playerCount: number;
  winnerId: string | null;
  isDraw: boolean;
  playerScore: number;
  createdAt: string;
}

interface MatchInfo {
  mode: string;
  connectN: number;
  roundsPlayed: number;
  durationSeconds: number;
}

class LeaderboardService {
  async updateRatings(changes: RatingChange[]): Promise<void> {
    for (const change of changes) {
      await query(
        `UPDATE users SET rating = $1, rating_deviation = GREATEST(rating_deviation - 10, 50), updated_at = NOW() WHERE id = $2`,
        [change.newRating, change.userId],
      );
    }
  }

  async recordMatchResult(
    matchId: string,
    players: MatchPlayer[],
    scores: Record<string, number>,
    winnerId: string | null,
    isDraw: boolean,
    matchInfo: MatchInfo,
  ): Promise<Record<string, number>> {
    const humanPlayers = players.filter((p) => !p.isBot);

    // 1. Get current ratings for human players
    const ratingMap = new Map<
      string,
      { rating: number; ratingDeviation: number; gamesPlayed: number }
    >();
    for (const player of humanPlayers) {
      const res = await query<{
        rating: number;
        rating_deviation: number;
        games_played: number;
      }>(
        `SELECT rating, rating_deviation, games_played FROM users WHERE id = $1`,
        [player.userId],
      );
      if (res.rows[0]) {
        ratingMap.set(player.userId, {
          rating: res.rows[0].rating,
          ratingDeviation: res.rows[0].rating_deviation,
          gamesPlayed: res.rows[0].games_played,
        });
      }
    }

    // 2. Calculate rating changes
    const ratingPlayers = humanPlayers
      .filter((p) => ratingMap.has(p.userId))
      .map((p) => {
        const r = ratingMap.get(p.userId)!;
        return {
          userId: p.userId,
          rating: r.rating,
          ratingDeviation: r.ratingDeviation,
          gamesPlayed: r.gamesPlayed,
        };
      });

    const changes = calculateRatingChanges(ratingPlayers, {
      winnerId,
      isDraw,
      playerIds: ratingPlayers.map((p) => p.userId),
    });

    const changeMap: Record<string, number> = {};
    for (const c of changes) {
      changeMap[c.userId] = c.ratingChange;
    }

    // 3. Update user stats and ratings
    for (const change of changes) {
      const isWinner = winnerId === change.userId;
      const winsInc = isWinner ? 1 : 0;
      const lossesInc = !isDraw && !isWinner ? 1 : 0;
      const drawsInc = isDraw ? 1 : 0;

      await query(
        `UPDATE users SET
          rating = $1,
          rating_deviation = GREATEST(rating_deviation - 10, 50),
          games_played = games_played + 1,
          wins = wins + $3,
          losses = losses + $4,
          draws = draws + $5,
          updated_at = NOW()
        WHERE id = $2`,
        [change.newRating, change.userId, winsInc, lossesInc, drawsInc],
      );
    }

    // 4. Insert match_history
    const dbWinnerId =
      winnerId && !winnerId.startsWith("bot-") ? winnerId : null;

    await query(
      `INSERT INTO match_history (id, mode, connect_n, player_count, winner_id, is_draw, rounds_played, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        matchId,
        matchInfo.mode,
        matchInfo.connectN,
        players.length,
        dbWinnerId,
        isDraw,
        matchInfo.roundsPlayed,
        matchInfo.durationSeconds,
      ],
    );

    // 5. Insert match_players with rating_before / rating_after
    for (const player of humanPlayers) {
      const ratingBefore = ratingMap.get(player.userId)?.rating ?? null;
      const change = changes.find((c) => c.userId === player.userId);
      const ratingAfter = change?.newRating ?? ratingBefore;

      await query(
        `INSERT INTO match_players (match_id, user_id, player_index, is_bot, score, rating_before, rating_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (match_id, user_id) DO NOTHING`,
        [
          matchId,
          player.userId,
          player.playerIndex,
          player.isBot,
          scores[player.userId] ?? 0,
          ratingBefore,
          ratingAfter,
        ],
      );
    }

    return changeMap;
  }

  async getGlobalLeaderboard(
    page: number,
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    const offset = (page - 1) * limit;
    const res = await query<{
      user_id: string;
      username: string;
      display_name: string | null;
      rating: number;
      games_played: number;
      wins: number;
      losses: number;
      draws: number;
    }>(
      `SELECT id AS user_id, username, display_name, rating, games_played, wins, losses, draws
       FROM users
       ORDER BY rating DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return res.rows.map((row, i) => ({
      rank: offset + i + 1,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name ?? row.username,
      rating: row.rating,
      gamesPlayed: row.games_played,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
    }));
  }

  async getPlayerRank(userId: string): Promise<number> {
    const res = await query<{ rank: string }>(
      `SELECT COUNT(*) + 1 AS rank FROM users WHERE rating > (SELECT rating FROM users WHERE id = $1)`,
      [userId],
    );
    return parseInt(res.rows[0]?.rank ?? "0", 10);
  }

  async getPlayerStats(userId: string): Promise<PlayerStats | null> {
    const userRes = await query<{
      rating: number;
      rating_deviation: number;
      games_played: number;
      wins: number;
      losses: number;
      draws: number;
    }>(
      `SELECT rating, rating_deviation, games_played, wins, losses, draws FROM users WHERE id = $1`,
      [userId],
    );

    if (!userRes.rows[0]) return null;

    const user = userRes.rows[0];
    const winRate =
      user.games_played > 0 ? user.wins / user.games_played : 0;

    // Calculate streaks from match history
    const matchRes = await query<{
      winner_id: string | null;
      is_draw: boolean;
    }>(
      `SELECT mh.winner_id, mh.is_draw
       FROM match_history mh
       JOIN match_players mp ON mh.id = mp.match_id
       WHERE mp.user_id = $1
       ORDER BY mh.created_at DESC`,
      [userId],
    );

    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 0;
    let countingCurrent = true;

    for (const row of matchRes.rows) {
      const isWin = !row.is_draw && row.winner_id === userId;
      if (isWin) {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        if (countingCurrent) currentStreak++;
      } else {
        streak = 0;
        countingCurrent = false;
      }
    }

    return {
      rating: user.rating,
      ratingDeviation: user.rating_deviation,
      gamesPlayed: user.games_played,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      winRate,
      currentStreak,
      bestStreak,
    };
  }

  async getRecentMatches(
    userId: string,
    limit: number,
  ): Promise<MatchSummary[]> {
    const res = await query<{
      match_id: string;
      mode: string;
      connect_n: number;
      player_count: number;
      winner_id: string | null;
      is_draw: boolean;
      score: number;
      created_at: string;
    }>(
      `SELECT mh.id AS match_id, mh.mode, mh.connect_n, mh.player_count,
              mh.winner_id, mh.is_draw, mp.score, mh.created_at
       FROM match_history mh
       JOIN match_players mp ON mh.id = mp.match_id
       WHERE mp.user_id = $1
       ORDER BY mh.created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    return res.rows.map((row) => ({
      matchId: row.match_id,
      mode: row.mode,
      connectN: row.connect_n,
      playerCount: row.player_count,
      winnerId: row.winner_id,
      isDraw: row.is_draw,
      playerScore: row.score,
      createdAt: row.created_at,
    }));
  }
}

export const leaderboardService = new LeaderboardService();
