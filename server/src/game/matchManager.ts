import { v4 as uuidv4 } from "uuid";
import type { Board } from "../engine/types.js";
import {
  createBoard,
  createBlockedGrid,
  dropPiece,
  getValidMoves,
  isBoardFull,
  generateBlockedCells,
} from "../engine/board.js";
import { checkWinAtPosition } from "../engine/winDetection.js";
import {
  validateMoveRate,
  validateTurnOrder,
  validateMoveInput,
  logSuspiciousActivity,
} from "./antiCheat.js";
import { ReconnectionManager } from "./reconnection.js";
import { redis } from "../db/redis.js";
import { query } from "../db/pool.js";

// ── Types ──

export interface MatchPlayer {
  userId: string;
  name: string;
  color: string;
  isBot: boolean;
  playerIndex: number; // 0-based, maps to PlayerId = playerIndex + 1
}

export interface OnlineMatch {
  matchId: string;
  config: {
    mode: "classic" | "fullboard";
    connectN: number;
    totalRounds: number;
    rows: number;
    cols: number;
  };
  players: MatchPlayer[];
  board: Board;
  blockedCells: boolean[][];
  currentTurnIndex: number;
  round: number;
  scores: Record<string, number>;
  status: "active" | "paused" | "finished";
  moveHistory: Array<{
    playerId: string;
    col: number;
    row: number;
    timestamp: number;
  }>;
  turnStartedAt: number;
  turnTimeoutMs: number;
  disconnectedPlayers: Set<string>;
  rematchVotes: Set<string>;
  createdAt: number;
}

export type MoveOutcome =
  | {
      type: "moved";
      board: Board;
      row: number;
      col: number;
      playerId: string;
      nextTurn: string;
    }
  | {
      type: "roundEnd";
      board: Board;
      row: number;
      col: number;
      playerId: string;
      winner: string | null;
      isDraw: boolean;
      scores: Record<string, number>;
      roundNumber: number;
    }
  | {
      type: "matchEnd";
      board: Board;
      row: number;
      col: number;
      playerId: string;
      winner: string | null;
      finalScores: Record<string, number>;
    }
  | { type: "invalid"; reason: string };

export interface RoundStartOutcome {
  board: Board;
  currentTurn: string;
  round: number;
}

export interface ReconnectOutcome {
  match: OnlineMatch;
}

export interface RematchOutcome {
  allVoted: boolean;
  newMatch?: OnlineMatch;
}

export interface MatchedPlayerInput {
  userId: string;
  name: string;
  color: string;
  isBot: boolean;
}

// ── Constants ──

const TURN_TIMEOUT_MS = 30_000;
const RECONNECT_TIMEOUT_MS = 60_000;

// ── MatchManager ──

export class MatchManager {
  private matches = new Map<string, OnlineMatch>();
  private userMatchIndex = new Map<string, string>(); // userId → matchId
  private turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private reconnectionManager = new ReconnectionManager();
  private onTurnTimeoutCb:
    | ((matchId: string, outcome: MoveOutcome) => void)
    | null = null;
  private onPlayerTimeoutCb:
    | ((matchId: string, userId: string) => void)
    | null = null;

  setTurnTimeoutCallback(
    cb: (matchId: string, outcome: MoveOutcome) => void,
  ): void {
    this.onTurnTimeoutCb = cb;
  }

  setPlayerTimeoutCallback(
    cb: (matchId: string, userId: string) => void,
  ): void {
    this.onPlayerTimeoutCb = cb;
  }

  // ── Public API ──

  /** Recover active matches from Redis after a server restart. */
  async recoverMatchesFromRedis(): Promise<number> {
    let recovered = 0;
    try {
      const keys = await redis.keys("connectx:match:*");
      for (const key of keys) {
        const raw = await redis.get(key);
        if (!raw) continue;
        try {
          const data = JSON.parse(raw);
          if (data.status === "finished") continue;

          const match: OnlineMatch = {
            ...data,
            disconnectedPlayers: new Set(data.disconnectedPlayers ?? []),
            rematchVotes: new Set(data.rematchVotes ?? []),
          };

          this.matches.set(match.matchId, match);
          for (const p of match.players) {
            this.userMatchIndex.set(p.userId, match.matchId);
          }
          if (match.status === "active") {
            this.startTurnTimer(match.matchId);
          }
          recovered++;
        } catch {
          console.error(`[matchManager] Failed to parse match from key ${key}`);
        }
      }
      if (recovered > 0) {
        console.log(`[matchManager] Recovered ${recovered} match(es) from Redis`);
      }
    } catch (err) {
      console.error("[matchManager] Redis recovery failed:", err);
    }
    return recovered;
  }

  createMatch(
    players: MatchedPlayerInput[],
    config: OnlineMatch["config"],
    matchId?: string,
  ): OnlineMatch {
    const id = matchId ?? uuidv4();

    // Randomize turn order
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matchPlayers: MatchPlayer[] = shuffled.map((p, i) => ({
      userId: p.userId,
      name: p.name,
      color: p.color,
      isBot: p.isBot,
      playerIndex: i,
    }));

    const boardConfig = {
      rows: config.rows,
      cols: config.cols,
      connectN: config.connectN,
    };

    const scores: Record<string, number> = {};
    for (const p of matchPlayers) {
      scores[p.userId] = 0;
    }

    const match: OnlineMatch = {
      matchId: id,
      config,
      players: matchPlayers,
      board: createBoard(boardConfig),
      blockedCells: createBlockedGrid(boardConfig),
      currentTurnIndex: 0,
      round: 1,
      scores,
      status: "active",
      moveHistory: [],
      turnStartedAt: Date.now(),
      turnTimeoutMs: TURN_TIMEOUT_MS,
      disconnectedPlayers: new Set(),
      rematchVotes: new Set(),
      createdAt: Date.now(),
    };

    this.matches.set(id, match);
    for (const p of matchPlayers) {
      this.userMatchIndex.set(p.userId, id);
    }

    this.persistMatchToRedis(match).catch((err) =>
      console.error("[matchManager] Redis persist failed:", err),
    );

    this.startTurnTimer(id);
    return match;
  }

  getMatch(matchId: string): OnlineMatch | null {
    return this.matches.get(matchId) ?? null;
  }

  getMatchByUserId(userId: string): OnlineMatch | null {
    const matchId = this.userMatchIndex.get(userId);
    if (!matchId) return null;
    return this.matches.get(matchId) ?? null;
  }

  /**
   * THE CORE METHOD — validate, apply, and evaluate a move.
   * @param isAutoPlay true when called by turn-timeout (skips anti-cheat)
   */
  processMove(
    matchId: string,
    userId: string,
    col: number,
    isAutoPlay = false,
  ): MoveOutcome {
    const match = this.matches.get(matchId);
    if (!match) return { type: "invalid", reason: "Match not found" };
    if (match.status !== "active")
      return { type: "invalid", reason: "Match is not active" };

    // ── Anti-cheat (skipped for auto-play / timeouts) ──
    if (!isAutoPlay) {
      if (!validateMoveRate(userId, Date.now())) {
        logSuspiciousActivity(
          userId,
          "rapid_moves",
          `Rate limit in match ${matchId}`,
        );
        return { type: "invalid", reason: "Move rate limit exceeded" };
      }
      if (!validateTurnOrder(match, userId)) {
        logSuspiciousActivity(
          userId,
          "wrong_turn",
          `Out-of-turn in match ${matchId}`,
        );
        return { type: "invalid", reason: "Not your turn" };
      }
      if (!validateMoveInput(col, match)) {
        logSuspiciousActivity(
          userId,
          "invalid_move",
          `Bad col ${col} in match ${matchId}`,
        );
        return { type: "invalid", reason: "Invalid move" };
      }
    }

    this.clearTurnTimer(matchId);

    // ── Apply move ──
    const currentPlayer = match.players[match.currentTurnIndex];
    const enginePlayerId = currentPlayer.playerIndex + 1; // 1-indexed
    const result = dropPiece(
      match.board,
      col,
      enginePlayerId,
      match.blockedCells,
    );
    if (!result) return { type: "invalid", reason: "Move failed" };

    match.board = result.board;
    match.moveHistory.push({
      playerId: userId,
      col,
      row: result.row,
      timestamp: Date.now(),
    });

    // ── Evaluate outcome ──
    const winner = checkWinAtPosition(
      match.board,
      result.row,
      col,
      match.config.connectN,
    );
    const boardFull =
      !winner && isBoardFull(match.board, match.blockedCells);

    if (winner || boardFull) {
      if (winner) {
        match.scores[userId] = (match.scores[userId] ?? 0) + 1;
      }

      const isLastRound = match.round >= match.config.totalRounds;

      if (isLastRound) {
        match.status = "finished";
        return {
          type: "matchEnd",
          board: match.board,
          row: result.row,
          col,
          playerId: userId,
          winner: this.getOverallWinner(match),
          finalScores: { ...match.scores },
        };
      }

      return {
        type: "roundEnd",
        board: match.board,
        row: result.row,
        col,
        playerId: userId,
        winner: winner ? userId : null,
        isDraw: boardFull,
        scores: { ...match.scores },
        roundNumber: match.round,
      };
    }

    // No win, no draw — advance turn
    const nextTurn = this.advanceTurn(match);
    match.turnStartedAt = Date.now();
    this.startTurnTimer(matchId);

    return {
      type: "moved",
      board: match.board,
      row: result.row,
      col,
      playerId: userId,
      nextTurn,
    };
  }

  startNextRound(matchId: string): RoundStartOutcome | null {
    const match = this.matches.get(matchId);
    if (!match) return null;

    match.round += 1;

    const boardConfig = {
      rows: match.config.rows,
      cols: match.config.cols,
      connectN: match.config.connectN,
    };

    if (match.config.mode === "fullboard") {
      match.blockedCells = generateBlockedCells(match.board);
    } else {
      match.blockedCells = createBlockedGrid(boardConfig);
    }

    match.board = createBoard(boardConfig);

    // Rotate starting player
    match.currentTurnIndex =
      (match.currentTurnIndex + 1) % match.players.length;
    this.skipDisconnectedPlayers(match);

    match.turnStartedAt = Date.now();
    match.moveHistory = [];
    this.startTurnTimer(matchId);

    return {
      board: match.board,
      currentTurn: match.players[match.currentTurnIndex].userId,
      round: match.round,
    };
  }

  handleDisconnect(matchId: string, userId: string): void {
    const match = this.matches.get(matchId);
    if (!match || match.status === "finished") return;

    match.disconnectedPlayers.add(userId);

    // If all human players disconnected, pause the match
    const connectedHumans = match.players.filter(
      (p) => !p.isBot && !match.disconnectedPlayers.has(p.userId),
    );
    if (connectedHumans.length === 0) {
      match.status = "paused";
      this.clearTurnTimer(matchId);
    }

    // Start reconnection timer
    this.reconnectionManager.startTimer(
      matchId,
      userId,
      RECONNECT_TIMEOUT_MS,
      () => this.handleReconnectTimeout(matchId, userId),
    );
  }

  handleReconnect(
    matchId: string,
    userId: string,
  ): ReconnectOutcome | null {
    const match = this.matches.get(matchId);
    if (!match) return null;

    match.disconnectedPlayers.delete(userId);
    this.reconnectionManager.cancelTimer(matchId, userId);

    if (match.status === "paused") {
      match.status = "active";
      match.turnStartedAt = Date.now();
      this.startTurnTimer(matchId);
    }

    return { match };
  }

  handleRematchVote(
    matchId: string,
    userId: string,
  ): RematchOutcome {
    const match = this.matches.get(matchId);
    if (!match) return { allVoted: false };

    match.rematchVotes.add(userId);

    const humanPlayers = match.players.filter((p) => !p.isBot);
    const allVoted = humanPlayers.every((p) =>
      match.rematchVotes.has(p.userId),
    );

    if (allVoted) {
      const newMatch = this.createMatch(
        match.players.map((p) => ({
          userId: p.userId,
          name: p.name,
          color: p.color,
          isBot: p.isBot,
        })),
        { ...match.config },
      );
      return { allVoted: true, newMatch };
    }

    return { allVoted: false };
  }

  async cleanupMatch(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    this.clearTurnTimer(matchId);

    // Persist to PostgreSQL
    try {
      const overallWinner = this.getOverallWinner(match);
      const winnerPlayer = overallWinner
        ? match.players.find((p) => p.userId === overallWinner)
        : null;
      const winnerId =
        winnerPlayer && !winnerPlayer.isBot ? overallWinner : null;
      const isDraw = overallWinner === null;
      const durationSeconds = Math.floor(
        (Date.now() - match.createdAt) / 1000,
      );

      await query(
        `INSERT INTO match_history (id, mode, connect_n, player_count, winner_id, is_draw, rounds_played, duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          matchId,
          match.config.mode,
          match.config.connectN,
          match.players.length,
          winnerId,
          isDraw,
          match.round,
          durationSeconds,
        ],
      );

      for (const player of match.players) {
        if (player.isBot) continue;
        await query(
          `INSERT INTO match_players (match_id, user_id, player_index, is_bot, score)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (match_id, user_id) DO NOTHING`,
          [
            matchId,
            player.userId,
            player.playerIndex,
            player.isBot,
            match.scores[player.userId] ?? 0,
          ],
        );
      }
    } catch (err) {
      console.error("[matchManager] Failed to save match to DB:", err);
    }

    // Clean up in-memory state
    for (const player of match.players) {
      this.userMatchIndex.delete(player.userId);
      this.reconnectionManager.cancelTimer(matchId, player.userId);
    }
    this.matches.delete(matchId);
    redis.del(`connectx:match:${matchId}`).catch(() => {});
  }

  handleTurnTimeout(matchId: string): void {
    const match = this.matches.get(matchId);
    if (!match || match.status !== "active") return;

    const currentPlayer = match.players[match.currentTurnIndex];
    const validMoves = getValidMoves(match.board, match.blockedCells);
    if (validMoves.length === 0) return;

    // Auto-play a random valid move for the timed-out player
    const randomCol =
      validMoves[Math.floor(Math.random() * validMoves.length)];
    const outcome = this.processMove(
      matchId,
      currentPlayer.userId,
      randomCol,
      true,
    );

    if (this.onTurnTimeoutCb && outcome.type !== "invalid") {
      this.onTurnTimeoutCb(matchId, outcome);
    }
  }

  // ── Private helpers ──

  private advanceTurn(match: OnlineMatch): string {
    const count = match.players.length;
    let next = (match.currentTurnIndex + 1) % count;
    let attempts = 0;

    while (
      match.disconnectedPlayers.has(match.players[next].userId) &&
      attempts < count
    ) {
      next = (next + 1) % count;
      attempts++;
    }

    match.currentTurnIndex = next;
    return match.players[next].userId;
  }

  private skipDisconnectedPlayers(match: OnlineMatch): void {
    const count = match.players.length;
    let attempts = 0;
    while (
      match.disconnectedPlayers.has(
        match.players[match.currentTurnIndex].userId,
      ) &&
      attempts < count
    ) {
      match.currentTurnIndex =
        (match.currentTurnIndex + 1) % count;
      attempts++;
    }
  }

  private getOverallWinner(match: OnlineMatch): string | null {
    let maxScore = -1;
    let winner: string | null = null;
    let tied = false;

    for (const [userId, score] of Object.entries(match.scores)) {
      if (score > maxScore) {
        maxScore = score;
        winner = userId;
        tied = false;
      } else if (score === maxScore) {
        tied = true;
      }
    }

    return tied ? null : winner;
  }

  private startTurnTimer(matchId: string): void {
    this.clearTurnTimer(matchId);
    const match = this.matches.get(matchId);
    if (!match || match.status !== "active") return;

    const timer = setTimeout(() => {
      this.turnTimers.delete(matchId);
      this.handleTurnTimeout(matchId);
    }, match.turnTimeoutMs);

    this.turnTimers.set(matchId, timer);
  }

  private clearTurnTimer(matchId: string): void {
    const timer = this.turnTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(matchId);
    }
  }

  private handleReconnectTimeout(
    matchId: string,
    userId: string,
  ): void {
    const match = this.matches.get(matchId);
    if (!match) return;

    // If only one (or zero) humans remain connected, end the match
    const connectedHumans = match.players.filter(
      (p) =>
        !p.isBot && !match.disconnectedPlayers.has(p.userId),
    );

    if (connectedHumans.length <= 1) {
      match.status = "finished";
      this.clearTurnTimer(matchId);

      if (this.onPlayerTimeoutCb) {
        this.onPlayerTimeoutCb(matchId, userId);
      }
    }
  }

  private async persistMatchToRedis(match: OnlineMatch): Promise<void> {
    const serializable = {
      ...match,
      disconnectedPlayers: [...match.disconnectedPlayers],
      rematchVotes: [...match.rematchVotes],
    };
    await redis.set(
      `connectx:match:${match.matchId}`,
      JSON.stringify(serializable),
      "EX",
      7200,
    );
  }
}

export const matchManager = new MatchManager();
