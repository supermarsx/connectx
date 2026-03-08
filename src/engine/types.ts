/** Core type definitions for the ConnectX game engine */

/** Represents an empty cell on the board */
export const EMPTY_CELL = 0;

/** Player identifier (1-indexed, 0 = empty) */
export type PlayerId = number;

/** A single cell on the board */
export type Cell = typeof EMPTY_CELL | PlayerId;

/**
 * The game board represented as a 2D array.
 * board[row][col] — row 0 is the top row.
 */
export type Board = Cell[][];

/** Game mode variants */
export type GameMode = 'classic' | 'fullboard';

/** Match type */
export type MatchType = 'local' | 'quickplay' | 'custom';

/** Bot difficulty levels */
export type BotDifficulty = 'easy' | 'medium' | 'hard';

/** Player type */
export type PlayerType = 'human' | 'bot';

/** Player configuration */
export interface PlayerConfig {
  id: PlayerId;
  name: string;
  type: PlayerType;
  botDifficulty?: BotDifficulty;
  color: string;
}

/** Board dimensions configuration */
export interface BoardConfig {
  rows: number;
  cols: number;
  connectN: number; // how many in a row to win (4, 5, or 6)
}

/** Game configuration for a match */
export interface GameConfig {
  board: BoardConfig;
  mode: GameMode;
  matchType: MatchType;
  players: PlayerConfig[];
  totalRounds: number;
}

/** Result of a move */
export interface MoveResult {
  valid: boolean;
  row: number;
  col: number;
  board: Board;
  winner: PlayerId | null;
  draw: boolean;
}

/** Per-round result */
export interface RoundResult {
  roundNumber: number;
  winner: PlayerId | null;
  draw: boolean;
  board: Board;
}

/** Current game phase */
export type GamePhase = 'menu' | 'lobby' | 'playing' | 'roundEnd' | 'matchEnd';

/** Full game state */
export interface GameState {
  phase: GamePhase;
  config: GameConfig;
  board: Board;
  currentPlayerIndex: number;
  round: number;
  scores: Record<PlayerId, number>;
  roundResults: RoundResult[];
  winner: PlayerId | null;
  isDraw: boolean;
  blockedCells: boolean[][]; // for fullboard mode
  moveHistory: Array<{ row: number; col: number; player: PlayerId }>;
}

/** Default board configuration (standard Connect 4) */
export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  rows: 6,
  cols: 7,
  connectN: 4,
};

/** Default player colors from the design spec */
export const PLAYER_COLORS = ['#FF6FAF', '#64E0C6', '#FFD36B', '#B388FF'];
