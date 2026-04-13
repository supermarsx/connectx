/**
 * Bot service local types.
 * Protocol types are imported from @connectx/shared.
 */

// Re-export engine types for local convenience
export type {
  Board,
  Cell,
  PlayerId,
  BotDifficulty,
  BoardConfig,
} from '@connectx/shared/engine';

export { EMPTY_CELL, DEFAULT_BOARD_CONFIG } from '@connectx/shared/engine';

// Re-export protocol types for local convenience
export type {
  BotSpawnRequest,
  BotMatchStarted,
  BotStateUpdate,
  BotRoundStarted,
  BotMatchEnded,
  BotDespawnRequest,
  BotMoveSubmission,
  ServerToBotEvents,
  BotToServerEvents,
} from '@connectx/shared';

/** A bot instance managed by this service */
export interface BotInstance {
  botId: string;
  matchId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  playerIndex: number;
  color: string;
  name: string;
}

/** Match state tracked locally by the bot service */
export interface BotMatchState {
  matchId: string;
  board: number[][];
  blockedCells: boolean[][];
  currentTurn: string;
  config: { rows: number; cols: number; connectN: number };
  players: Array<{
    userId: string;
    name: string;
    isBot: boolean;
    playerIndex: number;
  }>;
  status: 'active' | 'paused' | 'finished';
}
