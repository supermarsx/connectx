import { describe, it, expect } from 'vitest';
import { getBotMove } from '../engine/bot.ts';
import { createBoard } from '../engine/board.ts';

describe('getBotMove', () => {
  it('returns a valid column for empty board', () => {
    const board = createBoard();
    const col = getBotMove(board, 2, 'easy');
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(7);
  });

  it('medium bot takes winning move', () => {
    const board = createBoard();
    // Set up 3 in a row for bot (player 2)
    board[5][0] = 2;
    board[5][1] = 2;
    board[5][2] = 2;
    // Column 3 should win
    const col = getBotMove(board, 2, 'medium');
    expect(col).toBe(3);
  });

  it('medium bot blocks opponent win', () => {
    const board = createBoard();
    // Set up 3 in a row for opponent (player 1)
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    // Bot should block at column 3
    const col = getBotMove(board, 2, 'medium');
    expect(col).toBe(3);
  });

  it('hard bot takes winning move', () => {
    const board = createBoard();
    board[5][0] = 2;
    board[5][1] = 2;
    board[5][2] = 2;
    const col = getBotMove(board, 2, 'hard');
    expect(col).toBe(3);
  });

  it('hard bot blocks opponent win', () => {
    const board = createBoard();
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    const col = getBotMove(board, 2, 'hard');
    expect(col).toBe(3);
  });

  it('returns -1 when no valid moves', () => {
    const board = createBoard();
    // Fill entire board
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        board[r][c] = (r + c) % 2 + 1;
      }
    }
    const col = getBotMove(board, 1, 'easy');
    expect(col).toBe(-1);
  });
});
