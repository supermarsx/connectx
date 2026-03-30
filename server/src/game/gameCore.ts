import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../shared/protocol.js";
import { matchManager } from "./matchManager.js";
import type {
  OnlineMatch,
  MoveOutcome,
  MatchedPlayerInput,
} from "./matchManager.js";
import * as connectionManager from "../ws/connectionManager.js";
import { botService } from "../bot/botService.js";
import { scheduleBotTurnIfNeeded } from "../bot/botTurnScheduler.js";
import { leaderboardService } from "../leaderboard/leaderboardService.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Call once after Socket.IO server is created to wire callbacks. */
export function initGameCore(io: TypedServer): void {
  // Wire bot service to broadcast move outcomes
  botService.setMoveResultCallback(async (matchId, outcome) => {
    await broadcastMoveOutcome(io, matchId, outcome);
  });

  // When a turn times out: auto-play result is broadcast to the match room.
  matchManager.setTurnTimeoutCallback((matchId, outcome) => {
    broadcastMoveOutcome(io, matchId, outcome).catch((err) =>
      console.error("[gameCore] timeout broadcast error:", err),
    );
  });

  // When a player's reconnection window expires: end the match.
  matchManager.setPlayerTimeoutCallback(async (matchId, userId) => {
    const match = matchManager.getMatch(matchId);
    if (!match) return;

    const remaining = match.players.filter(
      (p) =>
        p.userId !== userId &&
        !match.disconnectedPlayers.has(p.userId),
    );
    const winner = remaining.length === 1 ? remaining[0].userId : null;
    const isDraw = winner === null;

    let ratingChanges: Record<string, number> = {};
    try {
      ratingChanges = await leaderboardService.recordMatchResult(
        matchId,
        match.players,
        { ...match.scores },
        winner,
        isDraw,
        {
          mode: match.config.mode,
          connectN: match.config.connectN,
          roundsPlayed: match.round,
          durationSeconds: Math.floor((Date.now() - match.createdAt) / 1000),
        },
      );
    } catch (err) {
      console.error("[gameCore] Failed to record match result:", err);
    }

    io.to(matchId).emit("match_end", {
      winner,
      finalScores: { ...match.scores },
      ratingChanges,
    });

    await matchManager.cleanupMatch(matchId);
    await cleanupPlayerStates(match);
  });
}

// ── Public handler functions ──

/** Create match, emit match_started to the room. Returns the match. */
export function handleMatchStart(
  io: TypedServer,
  matchId: string,
  players: MatchedPlayerInput[],
  config: OnlineMatch["config"],
): OnlineMatch {
  const match = matchManager.createMatch(players, config, matchId);

  io.to(matchId).emit("match_started", {
    matchId: match.matchId,
    board: match.board,
    turnOrder: match.players.map((p) => p.userId),
    currentTurn: match.players[match.currentTurnIndex].userId,
    config: match.config,
  });

  scheduleBotTurnIfNeeded(matchId);

  return match;
}

/** Process a submitted move and broadcast the outcome. */
export async function handleSubmitMove(
  io: TypedServer,
  socket: TypedSocket,
  matchId: string,
  col: number,
): Promise<void> {
  const user = socket.data.user as
    | { id: string; username: string }
    | undefined;
  if (!user) return;

  const outcome = matchManager.processMove(matchId, user.id, col);
  await broadcastMoveOutcome(io, matchId, outcome, socket);
}

/** Mark a player as disconnected, notify the room, start reconnect timer. */
export function handlePlayerDisconnect(
  io: TypedServer,
  matchId: string,
  userId: string,
): void {
  matchManager.handleDisconnect(matchId, userId);
  io.to(matchId).emit("player_disconnected", {
    playerId: userId,
    timeout: 60,
  });
}

/** Restore a reconnecting player: send full state, notify the room. */
export async function handlePlayerReconnect(
  io: TypedServer,
  socket: TypedSocket,
  matchId: string,
  userId: string,
): Promise<void> {
  const result = matchManager.handleReconnect(matchId, userId);
  if (!result) return;

  const { match } = result;

  socket.join(matchId);

  // Send full state to reconnecting player
  socket.emit("match_started", {
    matchId: match.matchId,
    board: match.board,
    turnOrder: match.players.map((p) => p.userId),
    currentTurn: match.players[match.currentTurnIndex].userId,
    config: match.config,
  });

  io.to(matchId).emit("player_reconnected", { playerId: userId });
  await connectionManager.setPlayerState(userId, {
    status: "inMatch",
    matchId,
  });
}

/** Register a rematch vote; if all humans voted, start a new match. */
export async function handleRematchRequest(
  io: TypedServer,
  socket: TypedSocket,
  matchId: string,
  userId: string,
): Promise<void> {
  const result = matchManager.handleRematchVote(matchId, userId);

  if (result.allVoted && result.newMatch) {
    const newMatch = result.newMatch;

    for (const player of newMatch.players) {
      if (player.isBot) continue;
      const socketId = await connectionManager.getSocketId(player.userId);
      if (socketId) {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
          playerSocket.join(newMatch.matchId);
          await connectionManager.setPlayerState(player.userId, {
            status: "inMatch",
            matchId: newMatch.matchId,
          });
        }
      }
    }

    io.to(newMatch.matchId).emit("match_started", {
      matchId: newMatch.matchId,
      board: newMatch.board,
      turnOrder: newMatch.players.map((p) => p.userId),
      currentTurn:
        newMatch.players[newMatch.currentTurnIndex].userId,
      config: newMatch.config,
    });

    scheduleBotTurnIfNeeded(newMatch.matchId);
  }
}

// ── Internal helpers ──

async function broadcastMoveOutcome(
  io: TypedServer,
  matchId: string,
  outcome: MoveOutcome,
  socket?: TypedSocket,
): Promise<void> {
  switch (outcome.type) {
    case "moved":
      io.to(matchId).emit("state_update", {
        board: outcome.board,
        currentTurn: outcome.nextTurn,
        lastMove: {
          row: outcome.row,
          col: outcome.col,
          playerId: outcome.playerId,
        },
        scores: matchManager.getMatch(matchId)?.scores ?? {},
      });
      scheduleBotTurnIfNeeded(matchId);
      break;

    case "roundEnd":
      io.to(matchId).emit("round_end", {
        roundNumber: outcome.roundNumber,
        winner: outcome.winner,
        isDraw: outcome.isDraw,
        scores: outcome.scores,
        board: outcome.board,
      });

      // Auto-start next round after 3 s
      setTimeout(() => {
        const roundStart = matchManager.startNextRound(matchId);
        if (roundStart) {
          io.to(matchId).emit("state_update", {
            board: roundStart.board,
            currentTurn: roundStart.currentTurn,
            lastMove: { row: -1, col: -1, playerId: "" },
            scores:
              matchManager.getMatch(matchId)?.scores ?? {},
          });
          scheduleBotTurnIfNeeded(matchId);
        }
      }, 3000);
      break;

    case "matchEnd": {
      const match = matchManager.getMatch(matchId);
      let ratingChanges: Record<string, number> = {};

      if (match) {
        try {
          ratingChanges = await leaderboardService.recordMatchResult(
            matchId,
            match.players,
            outcome.finalScores,
            outcome.winner,
            outcome.winner === null,
            {
              mode: match.config.mode,
              connectN: match.config.connectN,
              roundsPlayed: match.round,
              durationSeconds: Math.floor(
                (Date.now() - match.createdAt) / 1000,
              ),
            },
          );
        } catch (err) {
          console.error("[gameCore] Failed to record match result:", err);
        }
      }

      io.to(matchId).emit("match_end", {
        winner: outcome.winner,
        finalScores: outcome.finalScores,
        ratingChanges,
      });

      if (match) {
        await matchManager.cleanupMatch(matchId);
        await cleanupPlayerStates(match);
      }
      break;
    }

    case "invalid":
      if (socket) {
        socket.emit("move_rejected", { reason: outcome.reason });
      }
      break;
  }
}

async function cleanupPlayerStates(
  match: OnlineMatch,
): Promise<void> {
  for (const player of match.players) {
    if (player.isBot) continue;
    await connectionManager.setPlayerState(player.userId, {
      status: "idle",
    });
  }
}
