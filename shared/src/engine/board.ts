/**
 * Board operations for ConnectX.
 * Pure functions for creating and manipulating game boards.
 */

import type { Board, BoardConfig, Cell, PlayerId } from './types.js';
import { EMPTY_CELL, DEFAULT_BOARD_CONFIG } from './types.js';

/** Create an empty board with the given dimensions */
export function createBoard(config: BoardConfig = DEFAULT_BOARD_CONFIG): Board {
  return Array.from({ length: config.rows }, () =>
    Array.from<Cell>({ length: config.cols }).fill(EMPTY_CELL)
  );
}

/** Create a blocked-cells grid (all false) */
export function createBlockedGrid(config: BoardConfig = DEFAULT_BOARD_CONFIG): boolean[][] {
  return Array.from({ length: config.rows }, () =>
    Array.from<boolean>({ length: config.cols }).fill(false)
  );
}

/** Clone a board (deep copy) */
export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

/** Check if a column is valid and has space for a piece */
export function isValidMove(
  board: Board,
  col: number,
  blocked?: boolean[][]
): boolean {
  if (col < 0 || col >= board[0].length) return false;
  if (board[0][col] !== EMPTY_CELL) return false;
  for (let row = 0; row < board.length; row++) {
    if (board[row][col] === EMPTY_CELL && (!blocked || !blocked[row][col])) {
      return true;
    }
  }
  return false;
}

/** Get all valid columns for the current board state */
export function getValidMoves(board: Board, blocked?: boolean[][]): number[] {
  const moves: number[] = [];
  for (let col = 0; col < board[0].length; col++) {
    if (isValidMove(board, col, blocked)) {
      moves.push(col);
    }
  }
  return moves;
}

/**
 * Drop a piece into a column with gravity.
 * Returns a new board with the piece placed, and the row it landed on.
 * Returns null if the move is invalid.
 */
export function dropPiece(
  board: Board,
  col: number,
  player: PlayerId,
  blocked?: boolean[][]
): { board: Board; row: number } | null {
  if (!isValidMove(board, col, blocked)) return null;

  const newBoard = cloneBoard(board);

  for (let row = board.length - 1; row >= 0; row--) {
    if (newBoard[row][col] === EMPTY_CELL && (!blocked || !blocked[row][col])) {
      newBoard[row][col] = player;
      return { board: newBoard, row };
    }
  }

  return null;
}

/** Check if the board is completely full (draw condition) */
export function isBoardFull(board: Board, blocked?: boolean[][]): boolean {
  for (let col = 0; col < board[0].length; col++) {
    if (isValidMove(board, col, blocked)) return false;
  }
  return true;
}

/**
 * Generate blocked cells grid for fullboard mode.
 * All cells that were occupied in the previous round become blocked.
 */
export function generateBlockedCells(previousBoard: Board): boolean[][] {
  return previousBoard.map(row =>
    row.map(cell => cell !== EMPTY_CELL)
  );
}
