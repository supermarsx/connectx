import { describe, it, expect } from 'vitest';
import { checkWinAtPosition, findWinner, getWinningCells } from '../engine/winDetection.ts';
import { createBoard, dropPiece } from '../engine/board.ts';


describe('checkWinAtPosition', () => {
  it('returns null for empty cell', () => {
    const board = createBoard();
    expect(checkWinAtPosition(board, 0, 0)).toBeNull();
  });

  it('detects horizontal win', () => {
    const board = createBoard();
    // Place 4 in a row horizontally at bottom
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    board[5][3] = 1;
    expect(checkWinAtPosition(board, 5, 0)).toBe(1);
    expect(checkWinAtPosition(board, 5, 3)).toBe(1);
  });

  it('detects vertical win', () => {
    const board = createBoard();
    board[2][0] = 1;
    board[3][0] = 1;
    board[4][0] = 1;
    board[5][0] = 1;
    expect(checkWinAtPosition(board, 5, 0)).toBe(1);
    expect(checkWinAtPosition(board, 2, 0)).toBe(1);
  });

  it('detects diagonal ↘ win', () => {
    const board = createBoard();
    board[2][0] = 1;
    board[3][1] = 1;
    board[4][2] = 1;
    board[5][3] = 1;
    expect(checkWinAtPosition(board, 2, 0)).toBe(1);
    expect(checkWinAtPosition(board, 5, 3)).toBe(1);
  });

  it('detects diagonal ↙ win', () => {
    const board = createBoard();
    board[2][3] = 2;
    board[3][2] = 2;
    board[4][1] = 2;
    board[5][0] = 2;
    expect(checkWinAtPosition(board, 2, 3)).toBe(2);
    expect(checkWinAtPosition(board, 5, 0)).toBe(2);
  });

  it('does not false-positive with 3 in a row', () => {
    const board = createBoard();
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    expect(checkWinAtPosition(board, 5, 1)).toBeNull();
  });

  it('detects Connect 5', () => {
    const board = createBoard();
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    board[5][3] = 1;
    board[5][4] = 1;
    expect(checkWinAtPosition(board, 5, 2, 5)).toBe(1);
  });

  it('does not detect Connect 5 with only 4', () => {
    const board = createBoard();
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    board[5][3] = 1;
    expect(checkWinAtPosition(board, 5, 2, 5)).toBeNull();
  });
});

describe('findWinner', () => {
  it('returns null for empty board', () => {
    expect(findWinner(createBoard())).toBeNull();
  });

  it('finds horizontal winner', () => {
    const board = createBoard();
    board[5][1] = 2;
    board[5][2] = 2;
    board[5][3] = 2;
    board[5][4] = 2;
    expect(findWinner(board)).toBe(2);
  });
});

describe('getWinningCells', () => {
  it('returns null for no win', () => {
    const board = createBoard();
    board[5][0] = 1;
    expect(getWinningCells(board, 5, 0)).toBeNull();
  });

  it('returns winning cells for horizontal', () => {
    const board = createBoard();
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    board[5][3] = 1;
    const cells = getWinningCells(board, 5, 1);
    expect(cells).not.toBeNull();
    expect(cells!.length).toBeGreaterThanOrEqual(4);
  });
});

describe('win detection via gameplay simulation', () => {
  it('detects win after sequential drops', () => {
    let board = createBoard();
    // Player 1 drops in columns 0-3, player 2 in column 6
    for (let i = 0; i < 4; i++) {
      const r1 = dropPiece(board, i, 1);
      board = r1!.board;
      if (i < 3) {
        const r2 = dropPiece(board, 6, 2);
        board = r2!.board;
      }
    }
    // Check win at last dropped position
    expect(checkWinAtPosition(board, 5, 3)).toBe(1);
  });
});
