/**
 * Win detection for ConnectX.
 * Checks for N-in-a-row in all four directions (horizontal, vertical, two diagonals).
 */

import type { Board, PlayerId, BoardConfig } from './types.ts';
import { EMPTY_CELL, DEFAULT_BOARD_CONFIG } from './types.ts';

/** Direction vectors for the four possible win directions */
const DIRECTIONS = [
  { dr: 0, dc: 1 },   // horizontal →
  { dr: 1, dc: 0 },   // vertical ↓
  { dr: 1, dc: 1 },   // diagonal ↘
  { dr: 1, dc: -1 },  // diagonal ↙
];

/**
 * Check if dropping a piece at (row, col) creates a winning line.
 * Only checks lines passing through the given position for efficiency.
 */
export function checkWinAtPosition(
  board: Board,
  row: number,
  col: number,
  connectN: number = DEFAULT_BOARD_CONFIG.connectN
): PlayerId | null {
  const player = board[row][col];
  if (player === EMPTY_CELL) return null;

  const rows = board.length;
  const cols = board[0].length;

  for (const { dr, dc } of DIRECTIONS) {
    let count = 1;

    // Count in positive direction
    for (let i = 1; i < connectN; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (board[r][c] !== player) break;
      count++;
    }

    // Count in negative direction
    for (let i = 1; i < connectN; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (board[r][c] !== player) break;
      count++;
    }

    if (count >= connectN) return player;
  }

  return null;
}

/**
 * Full board scan to find any winner.
 * Less efficient than checkWinAtPosition but useful for validation.
 */
export function findWinner(
  board: Board,
  config: BoardConfig = DEFAULT_BOARD_CONFIG
): PlayerId | null {
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      if (board[row][col] === EMPTY_CELL) continue;
      const winner = checkWinAtPosition(board, row, col, config.connectN);
      if (winner !== null) return winner;
    }
  }
  return null;
}

/**
 * Get the winning cells (positions that form the winning line).
 * Returns an array of [row, col] pairs, or null if no win.
 */
export function getWinningCells(
  board: Board,
  row: number,
  col: number,
  connectN: number = DEFAULT_BOARD_CONFIG.connectN
): Array<[number, number]> | null {
  const player = board[row][col];
  if (player === EMPTY_CELL) return null;

  const rows = board.length;
  const cols = board[0].length;

  for (const { dr, dc } of DIRECTIONS) {
    const cells: Array<[number, number]> = [[row, col]];

    // Positive direction
    for (let i = 1; i < connectN; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (board[r][c] !== player) break;
      cells.push([r, c]);
    }

    // Negative direction
    for (let i = 1; i < connectN; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (board[r][c] !== player) break;
      cells.push([r, c]);
    }

    if (cells.length >= connectN) return cells;
  }

  return null;
}
