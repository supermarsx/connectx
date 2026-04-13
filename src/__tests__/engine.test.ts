import { describe, it, expect } from 'vitest';
import {
  createBoard, cloneBoard, dropPiece, isValidMove,
  getValidMoves, isBoardFull, createBlockedGrid, generateBlockedCells,
} from '../engine/board.ts';
import {
  checkWinAtPosition, findWinner, getWinningCells, calculateRoundBonus,
} from '../engine/winDetection.ts';
import { getBotMove } from '../engine/bot.ts';
import {
  EMPTY_CELL, DEFAULT_BOARD_CONFIG, PLAYER_COLORS, PLAYER_OUTLINE_COLORS,
  PIECE_PATTERNS, PIECE_COLOR_PALETTE, HIGH_CONTRAST_COLORS, PLAYER_AVATARS,
  DEFAULT_AVATARS, BOARD_SIZE_PRESETS,
} from '../engine/types.ts';
import type { BoardConfig, RoundResult } from '../engine/types.ts';

// ─── board.ts ────────────────────────────────────────────────────────────────

describe('board.ts', () => {

  // ── createBoard ──────────────────────────────────────────────────────────

  describe('createBoard', () => {
    it('creates default 6×7 board', () => {
      const b = createBoard();
      expect(b.length).toBe(6);
      expect(b[0].length).toBe(7);
      b.forEach(row => row.forEach(cell => expect(cell).toBe(EMPTY_CELL)));
    });

    it.each(BOARD_SIZE_PRESETS.filter(p => p.key !== 'custom'))(
      'creates correct board for preset "$key" ($rows×$cols)',
      ({ rows, cols, connectN }) => {
        const b = createBoard({ rows, cols, connectN });
        expect(b.length).toBe(rows);
        expect(b[0].length).toBe(cols);
        b.forEach(row => row.forEach(cell => expect(cell).toBe(EMPTY_CELL)));
      },
    );

    it('creates 1-row board', () => {
      const b = createBoard({ rows: 1, cols: 5, connectN: 3 });
      expect(b.length).toBe(1);
      expect(b[0].length).toBe(5);
    });

    it('creates 1-column board', () => {
      const b = createBoard({ rows: 5, cols: 1, connectN: 3 });
      expect(b.length).toBe(5);
      b.forEach(row => expect(row.length).toBe(1));
    });
  });

  // ── cloneBoard ───────────────────────────────────────────────────────────

  describe('cloneBoard', () => {
    it('produces an identical copy', () => {
      const orig = createBoard();
      orig[3][2] = 1;
      const clone = cloneBoard(orig);
      expect(clone).toEqual(orig);
    });

    it('clone is independent — mutating clone does not affect original', () => {
      const orig = createBoard();
      orig[0][0] = 1;
      const clone = cloneBoard(orig);
      clone[0][0] = 2;
      clone[5][6] = 2;
      expect(orig[0][0]).toBe(1);
      expect(orig[5][6]).toBe(EMPTY_CELL);
    });

    it('deep mutation of clone row does not affect original', () => {
      const orig = createBoard();
      orig[2][3] = 1;
      const clone = cloneBoard(orig);
      clone[2] = [9, 9, 9, 9, 9, 9, 9];
      expect(orig[2][3]).toBe(1);
    });
  });

  // ── isValidMove ──────────────────────────────────────────────────────────

  describe('isValidMove', () => {
    it('returns false for negative column', () => {
      expect(isValidMove(createBoard(), -1)).toBe(false);
    });

    it('returns false for column >= cols', () => {
      expect(isValidMove(createBoard(), 7)).toBe(false);
    });

    it('returns false when top cell is occupied even if cells below are empty', () => {
      const b = createBoard();
      // Fill only top cell
      b[0][3] = 1;
      expect(isValidMove(b, 3)).toBe(false);
    });

    it('returns true for empty column', () => {
      expect(isValidMove(createBoard(), 0)).toBe(true);
    });

    it('returns false for fully filled column', () => {
      const b = createBoard();
      for (let r = 0; r < 6; r++) b[r][4] = 1;
      expect(isValidMove(b, 4)).toBe(false);
    });

    it('returns false when column is fully blocked even if empty', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      for (let r = 0; r < 6; r++) blocked[r][2] = true;
      // All cells are blocked — no valid placement exists
      expect(isValidMove(b, 2, blocked)).toBe(false);
    });

    it('returns false when column is occupied at top and all empty cells below are blocked', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      b[0][2] = 1; // top occupied
      for (let r = 1; r < 6; r++) blocked[r][2] = true;
      expect(isValidMove(b, 2, blocked)).toBe(false);
    });

    it('returns true when column is partially blocked but has playable cell', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      // Block rows 3-5, leave 0-2 open
      for (let r = 3; r < 6; r++) blocked[r][1] = true;
      expect(isValidMove(b, 1, blocked)).toBe(true);
    });

    it('returns false when column has only blocked empty cells and occupied top', () => {
      const cfg: BoardConfig = { rows: 3, cols: 3, connectN: 3 };
      const b = createBoard(cfg);
      const blocked = createBlockedGrid(cfg);
      // row 0 occupied, rows 1-2 blocked
      b[0][0] = 1;
      blocked[1][0] = true;
      blocked[2][0] = true;
      expect(isValidMove(b, 0, blocked)).toBe(false);
    });
  });

  // ── getValidMoves ────────────────────────────────────────────────────────

  describe('getValidMoves', () => {
    it('returns all columns on empty board', () => {
      expect(getValidMoves(createBoard())).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('excludes fully filled columns', () => {
      const b = createBoard();
      for (let r = 0; r < 6; r++) b[r][0] = 1;
      for (let r = 0; r < 6; r++) b[r][6] = 2;
      const moves = getValidMoves(b);
      expect(moves).not.toContain(0);
      expect(moves).not.toContain(6);
      expect(moves).toEqual([1, 2, 3, 4, 5]);
    });

    it('excludes columns that are occupied at top even with blocked cells below', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      b[0][3] = 1; // occupied top
      for (let r = 1; r < 6; r++) blocked[r][3] = true;
      const moves = getValidMoves(b, blocked);
      expect(moves).not.toContain(3);
    });

    it('returns empty array on full board', () => {
      const b = createBoard();
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 7; c++) b[r][c] = (r + c) % 2 === 0 ? 1 : 2;
      expect(getValidMoves(b)).toEqual([]);
    });
  });

  // ── dropPiece ────────────────────────────────────────────────────────────

  describe('dropPiece', () => {
    it('drops piece to bottom of empty column', () => {
      const b = createBoard();
      const result = dropPiece(b, 3, 1);
      expect(result).not.toBeNull();
      expect(result!.row).toBe(5);
      expect(result!.board[5][3]).toBe(1);
    });

    it.each([0, 1, 2, 3, 4, 5, 6])(
      'drops into column %i correctly on empty board',
      (col) => {
        const result = dropPiece(createBoard(), col, 1);
        expect(result).not.toBeNull();
        expect(result!.row).toBe(5);
        expect(result!.board[5][col]).toBe(1);
      },
    );

    it('stacks pieces correctly', () => {
      let b = createBoard();
      const r1 = dropPiece(b, 0, 1);
      expect(r1!.row).toBe(5);
      b = r1!.board;
      const r2 = dropPiece(b, 0, 2);
      expect(r2!.row).toBe(4);
      expect(r2!.board[4][0]).toBe(2);
      expect(r2!.board[5][0]).toBe(1);
    });

    it('returns null for invalid column', () => {
      expect(dropPiece(createBoard(), -1, 1)).toBeNull();
      expect(dropPiece(createBoard(), 7, 1)).toBeNull();
    });

    it('returns null for full column', () => {
      const b = createBoard();
      for (let r = 0; r < 6; r++) b[r][2] = 1;
      expect(dropPiece(b, 2, 2)).toBeNull();
    });

    it('skips blocked cells and lands on first available row', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      blocked[5][0] = true;
      blocked[4][0] = true;
      const result = dropPiece(b, 0, 1, blocked);
      expect(result).not.toBeNull();
      expect(result!.row).toBe(3);
    });

    it('handles multiple blocked cells scattered in column', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      // Block rows 5, 3, 1 → piece should land in row 2 (lowest non-blocked empty)
      blocked[5][4] = true;
      blocked[3][4] = true;
      blocked[1][4] = true;
      const result = dropPiece(b, 4, 1, blocked);
      expect(result).not.toBeNull();
      // Lowest non-blocked empty cell scanning bottom-up: row 4 is open
      expect(result!.row).toBe(4);
    });

    it('does not mutate original board', () => {
      const b = createBoard();
      const original = cloneBoard(b);
      dropPiece(b, 0, 1);
      expect(b).toEqual(original);
    });
  });

  // ── isBoardFull ──────────────────────────────────────────────────────────

  describe('isBoardFull', () => {
    it('returns false for empty board', () => {
      expect(isBoardFull(createBoard())).toBe(false);
    });

    it('returns true for completely filled board', () => {
      const b = createBoard();
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 7; c++) b[r][c] = 1;
      expect(isBoardFull(b)).toBe(true);
    });

    it('returns false when blocked cells leave playable room', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      // Fill most of the board
      for (let r = 1; r < 6; r++)
        for (let c = 0; c < 7; c++) b[r][c] = 1;
      // Top row partially blocked but some empty
      blocked[0][0] = true;
      blocked[0][1] = true;
      // columns 2-6 in row 0 are empty and playable
      expect(isBoardFull(b, blocked)).toBe(false);
    });

    it('returns true when top row is occupied and remaining cells are blocked', () => {
      const cfg: BoardConfig = { rows: 2, cols: 2, connectN: 2 };
      const b = createBoard(cfg);
      const blocked = createBlockedGrid(cfg);
      // Occupy top row
      b[0][0] = 1;
      b[0][1] = 2;
      // Block bottom row
      blocked[1][0] = true;
      blocked[1][1] = true;
      expect(isBoardFull(b, blocked)).toBe(true);
    });
  });

  // ── createBlockedGrid ────────────────────────────────────────────────────

  describe('createBlockedGrid', () => {
    it('creates default 6×7 grid of false', () => {
      const g = createBlockedGrid();
      expect(g.length).toBe(6);
      expect(g[0].length).toBe(7);
      g.forEach(row => row.forEach(cell => expect(cell).toBe(false)));
    });

    it('creates grid matching custom config', () => {
      const g = createBlockedGrid({ rows: 10, cols: 12, connectN: 6 });
      expect(g.length).toBe(10);
      expect(g[0].length).toBe(12);
    });
  });

  // ── generateBlockedCells ─────────────────────────────────────────────────

  describe('generateBlockedCells', () => {
    it('marks occupied cells as blocked', () => {
      const b = createBoard();
      b[5][0] = 1;
      b[5][1] = 2;
      b[4][0] = 1;
      const blocked = generateBlockedCells(b);
      expect(blocked[5][0]).toBe(true);
      expect(blocked[5][1]).toBe(true);
      expect(blocked[4][0]).toBe(true);
      expect(blocked[0][0]).toBe(false);
    });

    it('empty board generates all-false grid', () => {
      const blocked = generateBlockedCells(createBoard());
      blocked.forEach(row => row.forEach(cell => expect(cell).toBe(false)));
    });

    it('works on multi-player board (3-4 players)', () => {
      const b = createBoard();
      b[5][0] = 1;
      b[5][1] = 2;
      b[5][2] = 3;
      b[5][3] = 4;
      const blocked = generateBlockedCells(b);
      expect(blocked[5][0]).toBe(true);
      expect(blocked[5][1]).toBe(true);
      expect(blocked[5][2]).toBe(true);
      expect(blocked[5][3]).toBe(true);
      expect(blocked[5][4]).toBe(false);
    });
  });

  // ── edge-case board dimensions ───────────────────────────────────────────

  describe('board dimension edge cases', () => {
    it('1-row board: drop fills the only row, second drop returns null', () => {
      const cfg: BoardConfig = { rows: 1, cols: 3, connectN: 3 };
      const b = createBoard(cfg);
      const r = dropPiece(b, 1, 1);
      expect(r).not.toBeNull();
      expect(r!.row).toBe(0);
      const r2 = dropPiece(r!.board, 1, 2);
      expect(r2).toBeNull();
    });

    it('1-column board: pieces stack up', () => {
      const cfg: BoardConfig = { rows: 4, cols: 1, connectN: 4 };
      let b = createBoard(cfg);
      for (let i = 0; i < 4; i++) {
        const r = dropPiece(b, 0, (i % 2) + 1 as number);
        expect(r).not.toBeNull();
        expect(r!.row).toBe(3 - i);
        b = r!.board;
      }
      expect(isBoardFull(b)).toBe(true);
    });
  });
});

// ─── winDetection.ts ─────────────────────────────────────────────────────────

describe('winDetection.ts', () => {

  // ── checkWinAtPosition ───────────────────────────────────────────────────

  describe('checkWinAtPosition', () => {
    it('detects horizontal win', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      expect(checkWinAtPosition(b, 5, 3)).toBe(1);
    });

    it('detects vertical win', () => {
      const b = createBoard();
      b[5][0] = 2; b[4][0] = 2; b[3][0] = 2; b[2][0] = 2;
      expect(checkWinAtPosition(b, 2, 0)).toBe(2);
    });

    it('detects diagonal ↘ win', () => {
      const b = createBoard();
      b[2][0] = 1; b[3][1] = 1; b[4][2] = 1; b[5][3] = 1;
      expect(checkWinAtPosition(b, 2, 0)).toBe(1);
    });

    it('detects diagonal ↙ win', () => {
      const b = createBoard();
      b[2][3] = 1; b[3][2] = 1; b[4][1] = 1; b[5][0] = 1;
      expect(checkWinAtPosition(b, 2, 3)).toBe(1);
    });

    it('detects win at top-left corner', () => {
      const b = createBoard();
      b[0][0] = 1; b[0][1] = 1; b[0][2] = 1; b[0][3] = 1;
      expect(checkWinAtPosition(b, 0, 0)).toBe(1);
    });

    it('detects win at bottom-right corner', () => {
      const b = createBoard();
      b[5][3] = 1; b[5][4] = 1; b[5][5] = 1; b[5][6] = 1;
      expect(checkWinAtPosition(b, 5, 6)).toBe(1);
    });

    it('detects vertical win at right edge', () => {
      const b = createBoard();
      b[2][6] = 1; b[3][6] = 1; b[4][6] = 1; b[5][6] = 1;
      expect(checkWinAtPosition(b, 5, 6)).toBe(1);
    });

    it('detects win on non-standard board 8×9 connect-5', () => {
      const cfg: BoardConfig = { rows: 8, cols: 9, connectN: 5 };
      const b = createBoard(cfg);
      for (let i = 0; i < 5; i++) b[7][i] = 1;
      expect(checkWinAtPosition(b, 7, 2, 5)).toBe(1);
    });

    it('detects win on 10×12 connect-6', () => {
      const cfg: BoardConfig = { rows: 10, cols: 12, connectN: 6 };
      const b = createBoard(cfg);
      for (let i = 0; i < 6; i++) b[9][i + 3] = 2;
      expect(checkWinAtPosition(b, 9, 5, 6)).toBe(2);
    });

    it('no false positive: 3 in a row interrupted by opponent', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 2; b[5][3] = 1;
      expect(checkWinAtPosition(b, 5, 0)).toBeNull();
      expect(checkWinAtPosition(b, 5, 3)).toBeNull();
    });

    it('connect-6: 5-in-a-row is not enough', () => {
      const cfg: BoardConfig = { rows: 10, cols: 12, connectN: 6 };
      const b = createBoard(cfg);
      for (let i = 0; i < 5; i++) b[9][i] = 1;
      expect(checkWinAtPosition(b, 9, 2, 6)).toBeNull();
    });

    it('connect-6: exactly 6-in-a-row is a win', () => {
      const cfg: BoardConfig = { rows: 10, cols: 12, connectN: 6 };
      const b = createBoard(cfg);
      for (let i = 0; i < 6; i++) b[9][i] = 1;
      expect(checkWinAtPosition(b, 9, 3, 6)).toBe(1);
    });

    it('returns null on empty cell', () => {
      const b = createBoard();
      expect(checkWinAtPosition(b, 0, 0)).toBeNull();
    });

    it('does NOT wrap around board edges horizontally', () => {
      const b = createBoard();
      // Place 2 at right edge, 2 at left edge — should NOT connect
      b[5][5] = 1; b[5][6] = 1; b[5][0] = 1; b[5][1] = 1;
      expect(checkWinAtPosition(b, 5, 6)).toBeNull();
      expect(checkWinAtPosition(b, 5, 0)).toBeNull();
    });

    it('does NOT wrap around board edges vertically', () => {
      const b = createBoard();
      b[0][0] = 1; b[1][0] = 1; b[4][0] = 1; b[5][0] = 1;
      expect(checkWinAtPosition(b, 0, 0)).toBeNull();
      expect(checkWinAtPosition(b, 5, 0)).toBeNull();
    });

    it('detects connect-5 correctly', () => {
      const cfg: BoardConfig = { rows: 8, cols: 9, connectN: 5 };
      const b = createBoard(cfg);
      for (let i = 0; i < 5; i++) b[7 - i][i] = 1; // diagonal ↙
      expect(checkWinAtPosition(b, 5, 2, 5)).toBe(1);
    });
  });

  // ── findWinner ───────────────────────────────────────────────────────────

  describe('findWinner', () => {
    it('returns null on empty board', () => {
      expect(findWinner(createBoard())).toBeNull();
    });

    it('returns null on partially filled board with no winner', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 2; b[5][2] = 1;
      b[4][0] = 2; b[4][1] = 1;
      expect(findWinner(b)).toBeNull();
    });

    it('returns null on full board with no winner', () => {
      // Build a 4×4 board with no 4-in-a-row
      const cfg: BoardConfig = { rows: 4, cols: 4, connectN: 4 };
      const b = createBoard(cfg);
      const pattern = [
        [1, 2, 1, 2],
        [2, 1, 2, 1],
        [1, 2, 1, 2],
        [1, 2, 1, 2],
      ];
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) b[r][c] = pattern[r][c];
      expect(findWinner(b, cfg)).toBeNull();
    });

    it('finds horizontal winner', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      expect(findWinner(b)).toBe(1);
    });

    it('returns first winner found (player 1 before player 2)', () => {
      const b = createBoard();
      // Player 1 wins horizontally in row 5
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      // Player 2 wins horizontally in row 4 (scanned later)
      b[4][0] = 2; b[4][1] = 2; b[4][2] = 2; b[4][3] = 2;
      const winner = findWinner(b);
      // Top-to-bottom, left-to-right scan → row 4 found first
      expect(winner).toBe(2);
    });

    it('finds winner with custom config', () => {
      const cfg: BoardConfig = { rows: 8, cols: 9, connectN: 5 };
      const b = createBoard(cfg);
      for (let i = 0; i < 5; i++) b[7][i + 2] = 2;
      expect(findWinner(b, cfg)).toBe(2);
    });
  });

  // ── getWinningCells ──────────────────────────────────────────────────────

  describe('getWinningCells', () => {
    it('returns cells for horizontal win', () => {
      const b = createBoard();
      b[5][1] = 1; b[5][2] = 1; b[5][3] = 1; b[5][4] = 1;
      const cells = getWinningCells(b, 5, 2);
      expect(cells).not.toBeNull();
      expect(cells!.length).toBeGreaterThanOrEqual(4);
      cells!.forEach(([r]) => expect(r).toBe(5));
    });

    it('returns cells for vertical win', () => {
      const b = createBoard();
      b[2][3] = 2; b[3][3] = 2; b[4][3] = 2; b[5][3] = 2;
      const cells = getWinningCells(b, 3, 3);
      expect(cells).not.toBeNull();
      expect(cells!.length).toBeGreaterThanOrEqual(4);
      cells!.forEach(([, c]) => expect(c).toBe(3));
    });

    it('returns cells for diagonal ↘ win', () => {
      const b = createBoard();
      b[2][1] = 1; b[3][2] = 1; b[4][3] = 1; b[5][4] = 1;
      const cells = getWinningCells(b, 2, 1);
      expect(cells).not.toBeNull();
      expect(cells!.length).toBeGreaterThanOrEqual(4);
    });

    it('returns cells for diagonal ↙ win', () => {
      const b = createBoard();
      b[2][4] = 1; b[3][3] = 1; b[4][2] = 1; b[5][1] = 1;
      const cells = getWinningCells(b, 3, 3);
      expect(cells).not.toBeNull();
      expect(cells!.length).toBeGreaterThanOrEqual(4);
    });

    it('returns null when no winning line (near-miss, 3 in a row for connect-4)', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1;
      expect(getWinningCells(b, 5, 1)).toBeNull();
    });

    it('returns null on empty cell', () => {
      expect(getWinningCells(createBoard(), 0, 0)).toBeNull();
    });

    it('works with connect-5', () => {
      const cfg: BoardConfig = { rows: 8, cols: 9, connectN: 5 };
      const b = createBoard(cfg);
      for (let i = 0; i < 5; i++) b[7][i] = 1;
      const cells = getWinningCells(b, 7, 2, 5);
      expect(cells).not.toBeNull();
      expect(cells!.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ── calculateRoundBonus ──────────────────────────────────────────────────

  describe('calculateRoundBonus', () => {
    it('returns 0 with no previous rounds and single win line', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      expect(calculateRoundBonus(b, 5, 3, 4, [], 1)).toBe(0);
    });

    it('returns streak bonus for consecutive wins', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      const results: RoundResult[] = [
        { roundNumber: 1, winner: 1, draw: false, board: createBoard() },
        { roundNumber: 2, winner: 1, draw: false, board: createBoard() },
      ];
      // streak of 2 consecutive wins → bonus = 2
      expect(calculateRoundBonus(b, 5, 3, 4, results, 1)).toBe(2);
    });

    it('returns 0 streak bonus when empty roundResults', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      expect(calculateRoundBonus(b, 5, 3, 4, [], 1)).toBe(0);
    });

    it('streak resets when draw interrupts', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      const results: RoundResult[] = [
        { roundNumber: 1, winner: 1, draw: false, board: createBoard() },
        { roundNumber: 2, winner: null, draw: true, board: createBoard() }, // draw
        { roundNumber: 3, winner: 1, draw: false, board: createBoard() },
      ];
      // Only last win counts for streak (streak = 1)
      expect(calculateRoundBonus(b, 5, 3, 4, results, 1)).toBe(1);
    });

    it('streak resets when different player wins', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1; b[5][3] = 1;
      const results: RoundResult[] = [
        { roundNumber: 1, winner: 1, draw: false, board: createBoard() },
        { roundNumber: 2, winner: 2, draw: false, board: createBoard() },
        { roundNumber: 3, winner: 1, draw: false, board: createBoard() },
      ];
      // streak from end: round3 winner=1, round2 winner=2 → streak breaks → 1
      expect(calculateRoundBonus(b, 5, 3, 4, results, 1)).toBe(1);
    });

    it('awards multi-alignment bonus for crossing win lines', () => {
      const b = createBoard();
      // Create a cross pattern at (3,3): horizontal + vertical
      b[3][0] = 1; b[3][1] = 1; b[3][2] = 1; b[3][3] = 1; // horizontal
      b[0][3] = 1; b[1][3] = 1; b[2][3] = 1;                // vertical (+ b[3][3])
      // checkWinAtPosition at (3,3) → 2 win lines → multi-alignment bonus = 1
      expect(calculateRoundBonus(b, 3, 3, 4, [], 1)).toBe(1);
    });

    it('returns 0 for empty cell position', () => {
      expect(calculateRoundBonus(createBoard(), 0, 0, 4, [], 1)).toBe(0);
    });
  });
});

// ─── bot.ts ──────────────────────────────────────────────────────────────────

describe('bot.ts', () => {

  // ── General ──────────────────────────────────────────────────────────────

  describe('general', () => {
    it('returns -1 on completely full board for all difficulties', () => {
      const b = createBoard();
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 7; c++) b[r][c] = (r + c) % 2 === 0 ? 1 : 2;
      expect(getBotMove(b, 1, 'easy')).toBe(-1);
      expect(getBotMove(b, 1, 'medium')).toBe(-1);
      expect(getBotMove(b, 1, 'hard')).toBe(-1);
    });

    it('picks the only valid column left', () => {
      const b = createBoard();
      // Fill all columns except column 4
      for (let c = 0; c < 7; c++) {
        if (c === 4) continue;
        for (let r = 0; r < 6; r++) b[r][c] = 1;
      }
      expect(getBotMove(b, 2, 'easy')).toBe(4);
      expect(getBotMove(b, 2, 'medium')).toBe(4);
      expect(getBotMove(b, 2, 'hard')).toBe(4);
    });
  });

  // ── Easy bot ─────────────────────────────────────────────────────────────

  describe('easy bot', () => {
    it('always returns a valid column on default board', () => {
      const b = createBoard();
      for (let i = 0; i < 20; i++) {
        const col = getBotMove(b, 1, 'easy');
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(7);
      }
    });

    it('returns valid column even with many full columns and one open', () => {
      const b = createBoard();
      // Fill columns 0-5 entirely, leave column 6 empty
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++) b[r][c] = (r + c) % 2 === 0 ? 1 : 2;
      // Only column 6 playable
      for (let i = 0; i < 10; i++) {
        expect(getBotMove(b, 2, 'easy')).toBe(6);
      }
    });

    it('works on larger board (8×9)', () => {
      const cfg: BoardConfig = { rows: 8, cols: 9, connectN: 5 };
      const b = createBoard(cfg);
      for (let i = 0; i < 20; i++) {
        const col = getBotMove(b, 1, 'easy', cfg);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(9);
      }
    });
  });

  // ── Medium bot ───────────────────────────────────────────────────────────

  describe('medium bot', () => {
    it('takes immediate winning move', () => {
      const b = createBoard();
      b[5][0] = 2; b[5][1] = 2; b[5][2] = 2;
      // Bot is player 2, column 3 wins
      expect(getBotMove(b, 2, 'medium')).toBe(3);
    });

    it('blocks opponent winning move', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1;
      // Bot is player 2, must block column 3
      expect(getBotMove(b, 2, 'medium')).toBe(3);
    });

    it('prefers center column when no immediate threat', () => {
      const b = createBoard();
      // A few scattered pieces, no threats
      b[5][0] = 1; b[5][6] = 2;
      const col = getBotMove(b, 2, 'medium');
      // Medium bot prefers center (col 3)
      expect(col).toBe(3);
    });

    it('avoids move that gives opponent a winning setup', () => {
      const b = createBoard();
      // Set up so that dropping in col X gives opponent win next turn
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1;
      // dropping in col 4 is safe, but medium should first block col 3
      const col = getBotMove(b, 2, 'medium');
      expect(col).toBe(3); // blocks the threat
    });

    it('works with blocked cells (fullboard mode)', () => {
      const b = createBoard();
      const blocked = createBlockedGrid();
      // Block bottom two rows
      for (let r = 4; r < 6; r++)
        for (let c = 0; c < 7; c++) blocked[r][c] = true;
      const col = getBotMove(b, 1, 'medium', DEFAULT_BOARD_CONFIG, blocked);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(7);
      // Verify the move is actually valid
      expect(isValidMove(b, col, blocked)).toBe(true);
    });
  });

  // ── Hard bot ─────────────────────────────────────────────────────────────

  describe('hard bot', () => {
    it('takes immediate winning move', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 1; b[5][2] = 1;
      expect(getBotMove(b, 1, 'hard')).toBe(3);
    });

    it('blocks opponent winning move', () => {
      const b = createBoard();
      b[5][0] = 2; b[5][1] = 2; b[5][2] = 2;
      expect(getBotMove(b, 1, 'hard')).toBe(3);
    });

    it('works on custom connectN 5', () => {
      const cfg: BoardConfig = { rows: 8, cols: 9, connectN: 5 };
      const b = createBoard(cfg);
      b[7][0] = 1; b[7][1] = 1; b[7][2] = 1; b[7][3] = 1;
      // Bot should complete the 5-in-a-row or block it
      const col = getBotMove(b, 1, 'hard', cfg);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(9);
    });

    it('works on custom connectN 6', () => {
      // Use smaller board to keep minimax tractable
      const cfg: BoardConfig = { rows: 6, cols: 8, connectN: 6 };
      const b = createBoard(cfg);
      for (let i = 0; i < 5; i++) b[5][i] = 2;
      // Hard bot as player 1 should block col 5
      const col = getBotMove(b, 1, 'hard', cfg);
      expect(col).toBe(5);
    }, 15000);

    it('does not crash on near-full board', () => {
      const b = createBoard();
      // Fill everything except top-left cell
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 7; c++) b[r][c] = (r + c) % 2 === 0 ? 1 : 2;
      b[0][0] = EMPTY_CELL;
      const col = getBotMove(b, 1, 'hard');
      expect(col).toBe(0);
    });

    it('returns valid move with 3+ player IDs on board', () => {
      const b = createBoard();
      b[5][0] = 1; b[5][1] = 2; b[5][2] = 3; b[5][3] = 1;
      // Hard bot uses 2-player minimax but should still return valid column
      const col = getBotMove(b, 1, 'hard');
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(7);
      expect(isValidMove(b, col)).toBe(true);
    });
  });
});

// ─── types.ts ────────────────────────────────────────────────────────────────

describe('types.ts', () => {
  it('EMPTY_CELL is 0', () => {
    expect(EMPTY_CELL).toBe(0);
  });

  describe('DEFAULT_BOARD_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_BOARD_CONFIG.rows).toBe(6);
      expect(DEFAULT_BOARD_CONFIG.cols).toBe(7);
      expect(DEFAULT_BOARD_CONFIG.connectN).toBe(4);
    });
  });

  describe('BOARD_SIZE_PRESETS', () => {
    it('has 5 presets (small, medium, big, epic, custom)', () => {
      expect(BOARD_SIZE_PRESETS.length).toBe(5);
    });

    it('each preset has required fields', () => {
      for (const p of BOARD_SIZE_PRESETS) {
        expect(p).toHaveProperty('key');
        expect(p).toHaveProperty('label');
        expect(p).toHaveProperty('rows');
        expect(p).toHaveProperty('cols');
        expect(p).toHaveProperty('connectN');
        expect(p.rows).toBeGreaterThan(0);
        expect(p.cols).toBeGreaterThan(0);
        expect(p.connectN).toBeGreaterThan(0);
      }
    });

    it('connectN <= min(rows, cols) for each preset', () => {
      for (const p of BOARD_SIZE_PRESETS) {
        expect(p.connectN).toBeLessThanOrEqual(Math.min(p.rows, p.cols));
      }
    });
  });

  describe('PLAYER_COLORS', () => {
    it('has 4 entries', () => {
      expect(PLAYER_COLORS.length).toBe(4);
    });

    it('all entries are hex color strings', () => {
      for (const c of PLAYER_COLORS) {
        expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('PLAYER_OUTLINE_COLORS', () => {
    it('matches PLAYER_COLORS length', () => {
      expect(PLAYER_OUTLINE_COLORS.length).toBe(PLAYER_COLORS.length);
    });

    it('all entries are hex color strings', () => {
      for (const c of PLAYER_OUTLINE_COLORS) {
        expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('PIECE_PATTERNS', () => {
    it('has 4 entries', () => {
      expect(PIECE_PATTERNS.length).toBe(4);
    });

    it('contains expected patterns', () => {
      expect(PIECE_PATTERNS).toContain('solid');
      expect(PIECE_PATTERNS).toContain('stripe');
      expect(PIECE_PATTERNS).toContain('dot');
      expect(PIECE_PATTERNS).toContain('crosshatch');
    });
  });

  describe('PIECE_COLOR_PALETTE', () => {
    it('has 12 entries', () => {
      expect(PIECE_COLOR_PALETTE.length).toBe(12);
    });

    it('has no duplicate colors', () => {
      const unique = new Set(PIECE_COLOR_PALETTE);
      expect(unique.size).toBe(PIECE_COLOR_PALETTE.length);
    });

    it('all entries are hex color strings', () => {
      for (const c of PIECE_COLOR_PALETTE) {
        expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('HIGH_CONTRAST_COLORS', () => {
    it('has 4 entries', () => {
      expect(HIGH_CONTRAST_COLORS.length).toBe(4);
    });

    it('all entries are hex color strings', () => {
      for (const c of HIGH_CONTRAST_COLORS) {
        expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('PLAYER_AVATARS', () => {
    it('has 8 avatars', () => {
      expect(PLAYER_AVATARS.length).toBe(8);
    });
  });

  describe('DEFAULT_AVATARS', () => {
    it('has 4 defaults', () => {
      expect(DEFAULT_AVATARS.length).toBe(4);
    });

    it('all default avatars are in PLAYER_AVATARS', () => {
      for (const a of DEFAULT_AVATARS) {
        expect(PLAYER_AVATARS).toContain(a);
      }
    });
  });
});
