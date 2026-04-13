/**
 * Win detection — re-exported from @connectx/shared.
 * calculateRoundBonus is client-only.
 */
export { checkWinAtPosition, findWinner, getWinningCells } from '@connectx/shared/engine';

// Client-only bonus calculation
import type { Board, PlayerId, BoardConfig, RoundResult } from './types.ts';
import { EMPTY_CELL, DEFAULT_BOARD_CONFIG } from './types.ts';

const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

export function calculateRoundBonus(
  board: Board,
  row: number,
  col: number,
  connectN: number,
  roundResults: RoundResult[],
  winner: PlayerId
): number {
  let bonus = 0;

  const player = board[row][col];
  if (player === EMPTY_CELL) return 0;

  const rows = board.length;
  const cols = board[0].length;

  let winLineCount = 0;
  for (const { dr, dc } of DIRECTIONS) {
    let count = 1;
    for (let i = 1; i < connectN; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (board[r][c] !== player) break;
      count++;
    }
    for (let i = 1; i < connectN; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (board[r][c] !== player) break;
      count++;
    }
    if (count >= connectN) winLineCount++;
  }
  if (winLineCount > 1) bonus += winLineCount - 1;

  let streak = 0;
  for (let i = roundResults.length - 1; i >= 0; i--) {
    if (roundResults[i].winner === winner) {
      streak++;
    } else {
      break;
    }
  }
  bonus += streak;

  return bonus;
}