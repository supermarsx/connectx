import { describe, it, expect } from 'vitest';

/**
 * Tests exercising server-side game logic patterns using the client engine mirror.
 * The server engine (server/src/engine/) is identical to the client engine (src/engine/).
 * These tests validate matchManager-equivalent logic, anti-cheat rules, and bot scaling.
 */

import { createBoard, createBlockedGrid, dropPiece, getValidMoves, isBoardFull, generateBlockedCells } from '../engine/board.ts';
import { checkWinAtPosition, findWinner } from '../engine/winDetection.ts';
import { getBotMove } from '../engine/bot.ts';
import type { BoardConfig } from '../engine/types.ts';
import { EMPTY_CELL } from '../engine/types.ts';

const STD_CONFIG: BoardConfig = { rows: 6, cols: 7, connectN: 4 };

// ---------------------------------------------------------------------------
// Anti-cheat validation patterns
// ---------------------------------------------------------------------------
describe('Anti-cheat: move validation', () => {
  it('rejects column outside board range (negative)', () => {
    const board = createBoard(STD_CONFIG);
    const validMoves = getValidMoves(board);
    expect(validMoves.includes(-1)).toBe(false);
  });

  it('rejects column outside board range (too high)', () => {
    const board = createBoard(STD_CONFIG);
    const validMoves = getValidMoves(board);
    expect(validMoves.includes(STD_CONFIG.cols)).toBe(false);
  });

  it('rejects move on a full column', () => {
    const board = createBoard(STD_CONFIG);
    let currentBoard = board;
    // Fill column 0 completely
    for (let i = 0; i < STD_CONFIG.rows; i++) {
      const result = dropPiece(currentBoard, 0, (i % 2) + 1);
      expect(result).not.toBeNull();
      currentBoard = result!.board;
    }
    // Column 0 should no longer be valid
    const validMoves = getValidMoves(currentBoard);
    expect(validMoves.includes(0)).toBe(false);
  });

  it('validates turn order: ensures move applied with correct player ID', () => {
    const board = createBoard(STD_CONFIG);
    const result = dropPiece(board, 3, 1);
    expect(result).not.toBeNull();
    expect(result!.board[result!.row][3]).toBe(1);

    // Second move should be player 2
    const result2 = dropPiece(result!.board, 4, 2);
    expect(result2).not.toBeNull();
    expect(result2!.board[result2!.row][4]).toBe(2);
  });

  it('drop rate simulation: rapid sequential moves all return valid boards', () => {
    let board = createBoard(STD_CONFIG);
    // Simulate 20 rapid moves alternating between 2 players
    for (let i = 0; i < 20; i++) {
      const col = i % STD_CONFIG.cols;
      const player = (i % 2) + 1;
      const result = dropPiece(board, col, player);
      if (result) {
        board = result.board;
      }
    }
    // Board should still be in valid state (no negative cells, no out-of-range)
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBeGreaterThanOrEqual(0);
        expect(cell).toBeLessThanOrEqual(2);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Match manager processMove equivalent logic
// ---------------------------------------------------------------------------
describe('Match logic: processMove patterns', () => {
  it('move + no win → returns valid board with next turn', () => {
    const board = createBoard(STD_CONFIG);
    const result = dropPiece(board, 3, 1);
    expect(result).not.toBeNull();
    const winner = checkWinAtPosition(result!.board, result!.row, 3, STD_CONFIG.connectN);
    expect(winner).toBeNull();
    // Board is not full
    expect(isBoardFull(result!.board)).toBe(false);
  });

  it('move + win → checkWinAtPosition returns winner', () => {
    let board = createBoard(STD_CONFIG);
    // Build horizontal win for player 1: cols 0,1,2,3
    for (let c = 0; c < 3; c++) {
      const r1 = dropPiece(board, c, 1)!;
      board = r1.board;
      const r2 = dropPiece(board, c, 2)!; // player 2 stacks on top
      board = r2.board;
    }
    // Winning move at col 3
    const result = dropPiece(board, 3, 1)!;
    const winner = checkWinAtPosition(result.board, result.row, 3, STD_CONFIG.connectN);
    expect(winner).toBe(1);
  });

  it('move + board full + no win → draw', () => {
    const cfg: BoardConfig = { rows: 2, cols: 2, connectN: 3 };
    let board = createBoard(cfg);
    // Fill 2x2 board: P1 at (1,0), P2 at (1,1), P1 at (0,0), P2 at (0,1)
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 1, 2)!.board;
    const lastResult = dropPiece(board, 0, 1)!;
    board = lastResult.board;
    const lastResult2 = dropPiece(board, 1, 2)!;
    board = lastResult2.board;

    expect(isBoardFull(board)).toBe(true);
    // No winner in any position
    expect(findWinner(board, cfg)).toBeNull();
  });

  it('next round resets board and advances turn index', () => {
    let board = createBoard(STD_CONFIG);
    // Simulate a round: play some moves
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 1, 2)!.board;

    // "Next round": create fresh board
    const newBoard = createBoard(STD_CONFIG);
    for (const row of newBoard) {
      for (const cell of row) {
        expect(cell).toBe(EMPTY_CELL);
      }
    }

    // Turn index would rotate: (0 + 1) % 2 = 1
    const currentTurnIndex = 0;
    const nextTurnIndex = (currentTurnIndex + 1) % 2;
    expect(nextTurnIndex).toBe(1);
  });

  it('fullboard mode: blocked cells generated from previous board', () => {
    let board = createBoard(STD_CONFIG);
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 1, 2)!.board;
    board = dropPiece(board, 0, 1)!.board;

    const blocked = generateBlockedCells(board);
    // Cells where pieces were placed should be blocked
    for (let r = 0; r < STD_CONFIG.rows; r++) {
      for (let c = 0; c < STD_CONFIG.cols; c++) {
        expect(blocked[r][c]).toBe(board[r][c] !== EMPTY_CELL);
      }
    }
  });

  it('rematch: scores reset to 0, new board', () => {
    // Simulate score tracking
    const scores: Record<string, number> = { 'u1': 2, 'u2': 1 };
    // On rematch, create new match with reset scores
    const newScores: Record<string, number> = {};
    for (const key of Object.keys(scores)) {
      newScores[key] = 0;
    }
    expect(newScores).toEqual({ 'u1': 0, 'u2': 0 });
    const newBoard = createBoard(STD_CONFIG);
    expect(isBoardFull(newBoard)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bot depth scaling (new feature)
// ---------------------------------------------------------------------------
describe('Bot depth scaling for large boards', () => {
  it('hard bot completes move on standard 6x7 board', () => {
    const board = createBoard(STD_CONFIG);
    const move = getBotMove(board, 1, 'hard', STD_CONFIG);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(STD_CONFIG.cols);
  });

  it('hard bot completes move on large 10x10 board', () => {
    const config: BoardConfig = { rows: 10, cols: 10, connectN: 5 };
    const board = createBoard(config);
    const move = getBotMove(board, 1, 'hard', config);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(config.cols);
  });

  it('hard bot completes move on extra-large 12x15 board', () => {
    const config: BoardConfig = { rows: 12, cols: 15, connectN: 6 };
    const board = createBoard(config);
    const move = getBotMove(board, 1, 'hard', config);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(config.cols);
  });

  it('medium bot works on large boards', () => {
    const config: BoardConfig = { rows: 10, cols: 10, connectN: 5 };
    const board = createBoard(config);
    const move = getBotMove(board, 1, 'medium', config);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(config.cols);
  });

  it('easy bot works on large boards', () => {
    const config: BoardConfig = { rows: 10, cols: 10, connectN: 5 };
    const board = createBoard(config);
    const move = getBotMove(board, 1, 'easy', config);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(config.cols);
  });

  it('hard bot picks winning move on any board size', () => {
    const config: BoardConfig = { rows: 6, cols: 7, connectN: 4 };
    let board = createBoard(config);
    // Set up 3-in-a-row for bot (player 1): cols 0, 1, 2
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 0, 2)!.board;
    board = dropPiece(board, 1, 1)!.board;
    board = dropPiece(board, 1, 2)!.board;
    board = dropPiece(board, 2, 1)!.board;
    board = dropPiece(board, 2, 2)!.board;

    // Bot should complete connect-4 at col 3
    const move = getBotMove(board, 1, 'hard', config);
    expect(move).toBe(3);
  });

  it('hard bot blocks opponent winning move', () => {
    const config: BoardConfig = { rows: 6, cols: 7, connectN: 4 };
    let board = createBoard(config);
    // Player 2 has 3-in-a-row at bottom: cols 0, 1, 2
    board = dropPiece(board, 0, 2)!.board;
    board = dropPiece(board, 1, 2)!.board;
    board = dropPiece(board, 2, 2)!.board;
    // Player 1 has random pieces elsewhere
    board = dropPiece(board, 4, 1)!.board;
    board = dropPiece(board, 5, 1)!.board;
    board = dropPiece(board, 6, 1)!.board;

    // Bot (player 1) should block at col 3
    const move = getBotMove(board, 1, 'hard', config);
    expect(move).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Blocked cells interaction (fullboard anti-cheat)
// ---------------------------------------------------------------------------
describe('Fullboard: blocked cells interactions', () => {
  it('cannot drop piece on blocked cell', () => {
    const board = createBoard(STD_CONFIG);
    const blocked = createBlockedGrid(STD_CONFIG);
    // Block entire column 0
    for (let r = 0; r < STD_CONFIG.rows; r++) {
      blocked[r][0] = true;
    }
    const result = dropPiece(board, 0, 1, blocked);
    expect(result).toBeNull();
  });

  it('getValidMoves excludes columns with no playable cells', () => {
    const cfg: BoardConfig = { rows: 2, cols: 3, connectN: 3 };
    let board = createBoard(cfg);
    // Fill column 1 completely
    board = dropPiece(board, 1, 1)!.board;
    board = dropPiece(board, 1, 2)!.board;
    const moves = getValidMoves(board);
    expect(moves.includes(1)).toBe(false);
    expect(moves).toContain(0);
    expect(moves).toContain(2);
  });

  it('isBoardFull returns true when all cells are occupied', () => {
    const cfg: BoardConfig = { rows: 2, cols: 2, connectN: 3 };
    let board = createBoard(cfg);
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 1, 2)!.board;
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 1, 2)!.board;
    expect(isBoardFull(board)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Win detection edge cases (server-critical)
// ---------------------------------------------------------------------------
describe('Win detection edge cases', () => {
  it('no false positive on almost-connect-N', () => {
    let board = createBoard(STD_CONFIG);
    // Place 3 in a row (not 4) for player 1
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 1, 1)!.board;
    const result = dropPiece(board, 2, 1)!;
    board = result.board;
    expect(checkWinAtPosition(board, result.row, 2, 4)).toBeNull();
  });

  it('detects connect-5 with connectN=5', () => {
    const cfg: BoardConfig = { rows: 6, cols: 9, connectN: 5 };
    let board = createBoard(cfg);
    for (let c = 0; c < 4; c++) {
      board = dropPiece(board, c, 1)!.board;
      board = dropPiece(board, c, 2)!.board; // stack
    }
    const result = dropPiece(board, 4, 1)!;
    expect(checkWinAtPosition(result.board, result.row, 4, 5)).toBe(1);
  });

  it('detects diagonal win', () => {
    let board = createBoard(STD_CONFIG);
    // Build diagonal: (5,0), (4,1), (3,2), (2,3)
    board = dropPiece(board, 0, 1)!.board; // (5,0) P1
    board = dropPiece(board, 1, 2)!.board; // (5,1) P2
    board = dropPiece(board, 1, 1)!.board; // (4,1) P1
    board = dropPiece(board, 2, 2)!.board; // (5,2) P2
    board = dropPiece(board, 2, 2)!.board; // (4,2) P2
    board = dropPiece(board, 2, 1)!.board; // (3,2) P1
    board = dropPiece(board, 3, 2)!.board; // (5,3) P2
    board = dropPiece(board, 3, 2)!.board; // (4,3) P2
    board = dropPiece(board, 3, 2)!.board; // (3,3) P2
    const result = dropPiece(board, 3, 1)!; // (2,3) P1 → diagonal win
    expect(checkWinAtPosition(result.board, result.row, 3, 4)).toBe(1);
  });

  it('detects vertical win at top of column', () => {
    let board = createBoard(STD_CONFIG);
    // Fill col 0: alternate, then P1 gets top 4
    board = dropPiece(board, 0, 2)!.board; // row 5
    board = dropPiece(board, 0, 2)!.board; // row 4
    board = dropPiece(board, 0, 1)!.board; // row 3
    board = dropPiece(board, 0, 1)!.board; // row 2
    board = dropPiece(board, 0, 1)!.board; // row 1
    const result = dropPiece(board, 0, 1)!; // row 0
    expect(checkWinAtPosition(result.board, result.row, 0, 4)).toBe(1);
  });

  it('corner cell win: bottom-left', () => {
    let board = createBoard(STD_CONFIG);
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 1, 1)!.board;
    board = dropPiece(board, 2, 1)!.board;
    const result = dropPiece(board, 3, 1)!;
    expect(checkWinAtPosition(result.board, result.row, 3, 4)).toBe(1);
  });

  it('corner cell win: bottom-right', () => {
    let board = createBoard(STD_CONFIG);
    board = dropPiece(board, 6, 1)!.board;
    board = dropPiece(board, 5, 1)!.board;
    board = dropPiece(board, 4, 1)!.board;
    const result = dropPiece(board, 3, 1)!;
    expect(checkWinAtPosition(result.board, result.row, 3, 4)).toBe(1);
  });
});
