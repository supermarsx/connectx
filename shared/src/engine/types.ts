/** Core shared type definitions for the ConnectX game engine */

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

/** Bot difficulty levels */
export type BotDifficulty = 'easy' | 'medium' | 'hard';

/** Piece pattern for colorblind accessibility */
export type PiecePattern = 'solid' | 'stripe' | 'dot' | 'crosshatch';
export const PIECE_PATTERNS: PiecePattern[] = ['solid', 'stripe', 'dot', 'crosshatch'];

/** Player configuration */
export interface PlayerConfig {
  id: PlayerId;
  name: string;
  type: 'human' | 'bot';
  botDifficulty?: BotDifficulty;
  color: string;
  outlineColor?: string;
  pattern?: PiecePattern;
  avatar?: string;
}

/** Board dimensions configuration */
export interface BoardConfig {
  rows: number;
  cols: number;
  connectN: number;
}

/** Default board configuration (standard Connect 4) */
export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  rows: 6,
  cols: 7,
  connectN: 4,
};

/** Default player colors from the design spec */
export const PLAYER_COLORS = ['#FF6FAF', '#64E0C6', '#FFD36B', '#B388FF'];
