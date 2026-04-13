import { describe, it, expect } from "vitest";
import { getBotMove } from "../engine/bot.js";
import { createBoard, dropPiece, getValidMoves } from "../engine/board.js";
import { checkWinAtPosition } from "../engine/winDetection.js";
import type { BotDifficulty, BoardConfig } from "../types.js";
import { DEFAULT_BOARD_CONFIG } from "../types.js";

describe("Bot Engine", () => {
  const difficulties: BotDifficulty[] = ["easy", "medium", "hard"];

  for (const difficulty of difficulties) {
    it(`${difficulty} bot returns a valid column on empty board`, () => {
      const board = createBoard();
      const col = getBotMove(board, 1, difficulty);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(7);
    });
  }

  it("bot takes winning move", () => {
    const board = createBoard();
    // Set up 3 in a row for player 1 at bottom
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    // Player 2 pieces
    board[4][0] = 2;
    board[4][1] = 2;

    const col = getBotMove(board, 1, "hard");
    expect(col).toBe(3); // Win by completing 4 in a row
  });

  it("bot blocks opponent winning move", () => {
    const board = createBoard();
    // Opponent (player 2) has 3 in a row at bottom
    board[5][0] = 2;
    board[5][1] = 2;
    board[5][2] = 2;
    // Bot pieces to avoid immediate win
    board[4][0] = 1;
    board[4][1] = 1;

    const col = getBotMove(board, 1, "medium");
    expect(col).toBe(3); // Block by filling column 3
  });

  it("works with 3-player games", () => {
    const board = createBoard();
    const col = getBotMove(board, 2, "medium", DEFAULT_BOARD_CONFIG, undefined, 3);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(7);
  });

  it("works with custom board size", () => {
    const config: BoardConfig = { rows: 8, cols: 9, connectN: 5 };
    const board = createBoard(config);
    const col = getBotMove(board, 1, "medium", config);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(9);
  });

  it("handles fullboard blocked cells", () => {
    const board = createBoard();
    const blocked = Array.from({ length: 6 }, () => Array(7).fill(false));
    // Block bottom row
    for (let c = 0; c < 7; c++) blocked[5][c] = true;

    const col = getBotMove(board, 1, "easy", DEFAULT_BOARD_CONFIG, blocked);
    expect(col).toBeGreaterThanOrEqual(0);
    // Piece should land on row 4 (above blocked row)
    const result = dropPiece(board, col, 1, blocked);
    expect(result).not.toBeNull();
    expect(result!.row).toBe(4);
  });
});

describe("Board Utils", () => {
  it("creates empty board", () => {
    const board = createBoard();
    expect(board).toHaveLength(6);
    expect(board[0]).toHaveLength(7);
    expect(board.flat().every((c) => c === 0)).toBe(true);
  });

  it("drops piece to bottom", () => {
    const board = createBoard();
    const result = dropPiece(board, 3, 1);
    expect(result).not.toBeNull();
    expect(result!.row).toBe(5);
    expect(result!.board[5][3]).toBe(1);
  });

  it("drops piece on top of existing", () => {
    const board = createBoard();
    board[5][3] = 1;
    const result = dropPiece(board, 3, 2);
    expect(result).not.toBeNull();
    expect(result!.row).toBe(4);
    expect(result!.board[4][3]).toBe(2);
  });

  it("returns null for full column", () => {
    const board = createBoard();
    for (let r = 0; r < 6; r++) board[r][3] = 1;
    expect(dropPiece(board, 3, 2)).toBeNull();
  });

  it("getValidMoves returns all non-full columns", () => {
    const board = createBoard();
    expect(getValidMoves(board)).toHaveLength(7);

    // Fill column 0
    for (let r = 0; r < 6; r++) board[r][0] = 1;
    expect(getValidMoves(board)).toHaveLength(6);
    expect(getValidMoves(board)).not.toContain(0);
  });
});

describe("Win Detection", () => {
  it("detects horizontal win", () => {
    const board = createBoard();
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    board[5][3] = 1;
    expect(checkWinAtPosition(board, 5, 3, 4)).toBe(1);
  });

  it("detects vertical win", () => {
    const board = createBoard();
    board[5][0] = 1;
    board[4][0] = 1;
    board[3][0] = 1;
    board[2][0] = 1;
    expect(checkWinAtPosition(board, 2, 0, 4)).toBe(1);
  });

  it("detects diagonal win", () => {
    const board = createBoard();
    board[5][0] = 1;
    board[4][1] = 1;
    board[3][2] = 1;
    board[2][3] = 1;
    expect(checkWinAtPosition(board, 2, 3, 4)).toBe(1);
  });

  it("returns null for no win", () => {
    const board = createBoard();
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    expect(checkWinAtPosition(board, 5, 2, 4)).toBeNull();
  });
});
