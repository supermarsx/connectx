/**
 * Bot service protocol types for ConnectX.
 * Single source of truth for bot ↔ server communication.
 */

import type { BoardConfig, Board } from './engine/types.js';

/** Server → Bot: spawn a new bot in a match */
export interface BotSpawnRequest {
  matchId: string;
  botId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  playerIndex: number;
  color: string;
  name: string;
}

/** Server → Bot: full match state when started or on reconnect */
export interface BotMatchStarted {
  matchId: string;
  board: number[][];
  blockedCells: boolean[][];
  turnOrder: string[];
  currentTurn: string;
  config: { rows: number; cols: number; connectN: number };
  players: Array<{
    userId: string;
    name: string;
    isBot: boolean;
    playerIndex: number;
  }>;
}

/** Server → Bot: state update after a move */
export interface BotStateUpdate {
  matchId: string;
  board: number[][];
  currentTurn: string;
  lastMove: { row: number; col: number; playerId: string };
  scores: Record<string, number>;
}

/** Server → Bot: round ended, new round starting */
export interface BotRoundStarted {
  matchId: string;
  board: number[][];
  blockedCells: boolean[][];
  currentTurn: string;
  round: number;
}

/** Server → Bot: match ended, clean up */
export interface BotMatchEnded {
  matchId: string;
}

/** Server → Bot: remove a bot from a match */
export interface BotDespawnRequest {
  matchId: string;
  botId: string;
}

/** Bot → Server: bot submits a move */
export interface BotMoveSubmission {
  matchId: string;
  botId: string;
  col: number;
}

/** Socket.IO events the main server sends to the bot service */
export interface ServerToBotEvents {
  bot_spawn: (data: BotSpawnRequest) => void;
  bot_despawn: (data: BotDespawnRequest) => void;
  bot_match_started: (data: BotMatchStarted) => void;
  bot_state_update: (data: BotStateUpdate) => void;
  bot_round_started: (data: BotRoundStarted) => void;
  bot_match_ended: (data: BotMatchEnded) => void;
}

/** Socket.IO events the bot service sends to the main server */
export interface BotToServerEvents {
  bot_move: (data: BotMoveSubmission) => void;
  bot_service_ready: (data: { maxBots: number }) => void;
}
