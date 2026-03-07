import { describe, it, expect } from 'vitest';
import {
  createBoard, cloneBoard, dropPiece, isValidMove,
  getValidMoves, isBoardFull, createBlockedGrid, generateBlockedCells,
} from '../engine/board.ts';
import { EMPTY_CELL } from '../engine/types.ts';

describe('createBoard', () => {
  it('creates a board with default dimensions', () => {
    const board = createBoard();
    expect(board.length).toBe(6);
    expect(board[0].length).toBe(7);
    board.forEach(row => row.forEach(cell => expect(cell).toBe(EMPTY_CELL)));
  });

  it('creates a board with custom dimensions', () => {
    const config = { rows: 8, cols: 9, connectN: 5 };
    const board = createBoard(config);
    expect(board.length).toBe(8);
    expect(board[0].length).toBe(9);
  });
});

describe('cloneBoard', () => {
  it('creates a deep copy', () => {
    const board = createBoard();
    board[5][3] = 1;
    const clone = cloneBoard(board);
    expect(clone[5][3]).toBe(1);
    clone[5][3] = 2;
    expect(board[5][3]).toBe(1); // original unchanged
  });
});

describe('isValidMove', () => {
  it('returns true for empty column', () => {
    const board = createBoard();
    expect(isValidMove(board, 3)).toBe(true);
  });

  it('returns false for out-of-bounds column', () => {
    const board = createBoard();
    expect(isValidMove(board, -1)).toBe(false);
    expect(isValidMove(board, 7)).toBe(false);
  });

  it('returns false for full column', () => {
    const board = createBoard();
    // Fill column 0
    for (let row = 0; row < 6; row++) {
      board[row][0] = 1;
    }
    expect(isValidMove(board, 0)).toBe(false);
  });
});

describe('getValidMoves', () => {
  it('returns all columns for empty board', () => {
    const board = createBoard();
    expect(getValidMoves(board)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('excludes full columns', () => {
    const board = createBoard();
    for (let row = 0; row < 6; row++) {
      board[row][3] = 1;
    }
    const moves = getValidMoves(board);
    expect(moves).not.toContain(3);
    expect(moves.length).toBe(6);
  });
});

describe('dropPiece', () => {
  it('places piece at the bottom of an empty column', () => {
    const board = createBoard();
    const result = dropPiece(board, 3, 1);
    expect(result).not.toBeNull();
    expect(result!.row).toBe(5);
    expect(result!.board[5][3]).toBe(1);
  });

  it('stacks pieces correctly', () => {
    const board = createBoard();
    board[5][3] = 1;
    const result = dropPiece(board, 3, 2);
    expect(result).not.toBeNull();
    expect(result!.row).toBe(4);
    expect(result!.board[4][3]).toBe(2);
    expect(result!.board[5][3]).toBe(1);
  });

  it('returns null for full column', () => {
    const board = createBoard();
    for (let row = 0; row < 6; row++) {
      board[row][0] = 1;
    }
    expect(dropPiece(board, 0, 2)).toBeNull();
  });

  it('does not mutate original board', () => {
    const board = createBoard();
    dropPiece(board, 3, 1);
    expect(board[5][3]).toBe(EMPTY_CELL);
  });
});

describe('isBoardFull', () => {
  it('returns false for empty board', () => {
    expect(isBoardFull(createBoard())).toBe(false);
  });

  it('returns true for completely filled board', () => {
    const board = createBoard();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        board[r][c] = (r + c) % 2 + 1;
      }
    }
    expect(isBoardFull(board)).toBe(true);
  });
});

describe('createBlockedGrid', () => {
  it('creates all-false grid', () => {
    const grid = createBlockedGrid();
    expect(grid.length).toBe(6);
    expect(grid[0].length).toBe(7);
    grid.forEach(row => row.forEach(cell => expect(cell).toBe(false)));
  });
});

describe('generateBlockedCells', () => {
  it('marks occupied cells as blocked', () => {
    const board = createBoard();
    board[5][3] = 1;
    board[4][3] = 2;
    const blocked = generateBlockedCells(board);
    expect(blocked[5][3]).toBe(true);
    expect(blocked[4][3]).toBe(true);
    expect(blocked[3][3]).toBe(false);
  });
});

describe('dropPiece with blocked cells', () => {
  it('skips blocked cells when dropping', () => {
    const board = createBoard();
    const blocked = createBlockedGrid();
    blocked[5][3] = true; // block bottom of col 3
    const result = dropPiece(board, 3, 1, blocked);
    expect(result).not.toBeNull();
    expect(result!.row).toBe(4); // should land one above blocked
  });
});
