import { describe, it, expect } from "vitest";
import {
  createBoard,
  dropPiece,
  isValidMove,
  getValidMoves,
  isBoardFull,
  generateBlockedCells,
  cloneBoard,
} from "../engine/board.js";
import { checkWinAtPosition, findWinner, getWinningCells } from "../engine/winDetection.js";
import { getBotMove } from "../engine/bot.js";
import type { Board, BoardConfig } from "../engine/types.js";
import { EMPTY_CELL, DEFAULT_BOARD_CONFIG } from "../engine/types.js";

// ── Board Creation ──

describe("createBoard", () => {
  it("creates a board with correct default dimensions (6×7)", () => {
    const board = createBoard();
    expect(board).toHaveLength(6);
    for (const row of board) {
      expect(row).toHaveLength(7);
    }
  });

  it("creates a board with custom dimensions", () => {
    const board = createBoard({ rows: 8, cols: 10, connectN: 5 });
    expect(board).toHaveLength(8);
    for (const row of board) {
      expect(row).toHaveLength(10);
    }
  });

  it("fills all cells with EMPTY_CELL", () => {
    const board = createBoard();
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBe(EMPTY_CELL);
      }
    }
  });
});

// ── dropPiece ──

describe("dropPiece", () => {
  it("drops a piece to the bottom row of an empty board", () => {
    const board = createBoard();
    const result = dropPiece(board, 3, 1);
    expect(result).not.toBeNull();
    expect(result!.row).toBe(5); // bottom row
    expect(result!.board[5][3]).toBe(1);
  });

  it("stacks pieces with gravity", () => {
    let board = createBoard();
    const r1 = dropPiece(board, 0, 1)!;
    expect(r1.row).toBe(5);
    const r2 = dropPiece(r1.board, 0, 2)!;
    expect(r2.row).toBe(4);
    const r3 = dropPiece(r2.board, 0, 1)!;
    expect(r3.row).toBe(3);
  });

  it("returns null for a full column", () => {
    let board = createBoard();
    for (let i = 0; i < 6; i++) {
      const res = dropPiece(board, 0, (i % 2) + 1 as any);
      expect(res).not.toBeNull();
      board = res!.board;
    }
    const result = dropPiece(board, 0, 1);
    expect(result).toBeNull();
  });

  it("does not mutate the original board", () => {
    const board = createBoard();
    const original = cloneBoard(board);
    dropPiece(board, 3, 1);
    expect(board).toEqual(original);
  });
});

// ── isValidMove ──

describe("isValidMove", () => {
  it("returns true for an empty column", () => {
    const board = createBoard();
    expect(isValidMove(board, 0)).toBe(true);
    expect(isValidMove(board, 6)).toBe(true);
  });

  it("returns false for negative column index", () => {
    const board = createBoard();
    expect(isValidMove(board, -1)).toBe(false);
  });

  it("returns false for column index beyond board width", () => {
    const board = createBoard();
    expect(isValidMove(board, 7)).toBe(false);
    expect(isValidMove(board, 100)).toBe(false);
  });

  it("returns false for a full column", () => {
    let board = createBoard();
    for (let i = 0; i < 6; i++) {
      board = dropPiece(board, 2, 1)!.board;
    }
    expect(isValidMove(board, 2)).toBe(false);
  });

  it("respects blocked cells — no valid unblocked empty slot", () => {
    // Fill bottom 3 rows, block top 3 rows → no unblocked empty cell
    let board = createBoard();
    board = dropPiece(board, 0, 1)!.board;
    board = dropPiece(board, 0, 2)!.board;
    board = dropPiece(board, 0, 1)!.board;
    const blocked = Array.from({ length: 6 }, () => Array(7).fill(false));
    blocked[0][0] = true;
    blocked[1][0] = true;
    blocked[2][0] = true;
    // Top 3 are blocked+empty, bottom 3 are filled → dropPiece would return null
    expect(dropPiece(board, 0, 1, blocked)).toBeNull();
  });
});

// ── generateBlockedCells ──

describe("generateBlockedCells", () => {
  it("marks occupied cells as blocked", () => {
    let board = createBoard();
    board = dropPiece(board, 3, 1)!.board;
    board = dropPiece(board, 4, 2)!.board;
    const blocked = generateBlockedCells(board);

    expect(blocked[5][3]).toBe(true);
    expect(blocked[5][4]).toBe(true);
  });

  it("leaves empty cells unblocked", () => {
    const board = createBoard();
    const blocked = generateBlockedCells(board);
    for (const row of blocked) {
      for (const cell of row) {
        expect(cell).toBe(false);
      }
    }
  });

  it("marks all cells as blocked on a full board", () => {
    let board = createBoard();
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 6; row++) {
        board = dropPiece(board, col, ((row + col) % 2) + 1 as any)!.board;
      }
    }
    const blocked = generateBlockedCells(board);
    for (const row of blocked) {
      for (const cell of row) {
        expect(cell).toBe(true);
      }
    }
  });
});

// ── Win Detection ──

describe("checkWinAtPosition", () => {
  it("detects horizontal win", () => {
    let board = createBoard();
    // Player 1 drops 4 in a row at bottom
    for (let c = 0; c < 4; c++) {
      board = dropPiece(board, c, 1)!.board;
    }
    const winner = checkWinAtPosition(board, 5, 3, 4);
    expect(winner).toBe(1);
  });

  it("detects vertical win", () => {
    let board = createBoard();
    for (let i = 0; i < 4; i++) {
      board = dropPiece(board, 0, 1)!.board;
    }
    const winner = checkWinAtPosition(board, 2, 0, 4);
    expect(winner).toBe(1);
  });

  it("detects diagonal-right (↘) win", () => {
    let board = createBoard();
    // Build a staircase for player 1 diag: (5,0),(4,1),(3,2),(2,3)
    // col 0: P1
    board = dropPiece(board, 0, 1)!.board;
    // col 1: P2, P1
    board = dropPiece(board, 1, 2)!.board;
    board = dropPiece(board, 1, 1)!.board;
    // col 2: P2, P2, P1
    board = dropPiece(board, 2, 2)!.board;
    board = dropPiece(board, 2, 2)!.board;
    board = dropPiece(board, 2, 1)!.board;
    // col 3: P2, P2, P2, P1
    board = dropPiece(board, 3, 2)!.board;
    board = dropPiece(board, 3, 2)!.board;
    board = dropPiece(board, 3, 2)!.board;
    board = dropPiece(board, 3, 1)!.board;

    const winner = checkWinAtPosition(board, 2, 3, 4);
    expect(winner).toBe(1);
  });

  it("detects diagonal-left (↙) win", () => {
    let board = createBoard();
    // Build staircase going left: (5,3),(4,2),(3,1),(2,0)
    board = dropPiece(board, 3, 1)!.board;
    // col 2: P2, P1
    board = dropPiece(board, 2, 2)!.board;
    board = dropPiece(board, 2, 1)!.board;
    // col 1: P2, P2, P1
    board = dropPiece(board, 1, 2)!.board;
    board = dropPiece(board, 1, 2)!.board;
    board = dropPiece(board, 1, 1)!.board;
    // col 0: P2, P2, P2, P1
    board = dropPiece(board, 0, 2)!.board;
    board = dropPiece(board, 0, 2)!.board;
    board = dropPiece(board, 0, 2)!.board;
    board = dropPiece(board, 0, 1)!.board;

    const winner = checkWinAtPosition(board, 2, 0, 4);
    expect(winner).toBe(1);
  });

  it("returns null for partial lines (3 in a row, connect-4)", () => {
    let board = createBoard();
    for (let c = 0; c < 3; c++) {
      board = dropPiece(board, c, 1)!.board;
    }
    const winner = checkWinAtPosition(board, 5, 2, 4);
    expect(winner).toBeNull();
  });

  it("returns null for empty cell", () => {
    const board = createBoard();
    expect(checkWinAtPosition(board, 0, 0, 4)).toBeNull();
  });
});

describe("findWinner", () => {
  it("returns null on empty board", () => {
    expect(findWinner(createBoard())).toBeNull();
  });

  it("finds a winner via full board scan", () => {
    let board = createBoard();
    for (let c = 0; c < 4; c++) {
      board = dropPiece(board, c, 1)!.board;
    }
    expect(findWinner(board)).toBe(1);
  });
});

describe("getWinningCells", () => {
  it("returns winning cell positions", () => {
    let board = createBoard();
    for (let c = 0; c < 4; c++) {
      board = dropPiece(board, c, 1)!.board;
    }
    const cells = getWinningCells(board, 5, 0, 4);
    expect(cells).not.toBeNull();
    expect(cells!.length).toBeGreaterThanOrEqual(4);
  });

  it("returns null when no win exists", () => {
    let board = createBoard();
    board = dropPiece(board, 0, 1)!.board;
    expect(getWinningCells(board, 5, 0, 4)).toBeNull();
  });
});

// ── Bot ──

describe("getBotMove", () => {
  const difficulties = ["easy", "medium", "hard"] as const;

  for (const difficulty of difficulties) {
    it(`${difficulty} bot returns a valid column on empty board`, () => {
      const board = createBoard();
      const col = getBotMove(board, 1, difficulty);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(7);
      expect(isValidMove(board, col)).toBe(true);
    });
  }

  it("returns -1 when the board is completely full", () => {
    let board = createBoard();
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 6; row++) {
        board = dropPiece(board, col, ((row + col) % 2) + 1 as any)!.board;
      }
    }
    const col = getBotMove(board, 1, "easy");
    expect(col).toBe(-1);
  });

  it("works with 3 players", () => {
    const board = createBoard();
    const col = getBotMove(board, 2, "medium", DEFAULT_BOARD_CONFIG, undefined, 3);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(7);
  });

  it("works with 4 players", () => {
    const board = createBoard();
    const col = getBotMove(board, 3, "hard", DEFAULT_BOARD_CONFIG, undefined, 4);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(7);
  });

  it("takes a winning move when available (medium/hard)", () => {
    // Set up a board where player 1 has 3 in a row at bottom
    let board = createBoard();
    for (let c = 0; c < 3; c++) {
      board = dropPiece(board, c, 1)!.board;
    }
    // Player 2 pieces elsewhere
    board = dropPiece(board, 6, 2)!.board;
    board = dropPiece(board, 5, 2)!.board;

    const col = getBotMove(board, 1, "hard");
    // Should pick col 3 to complete the win
    expect(col).toBe(3);
  });

  it("bot works on a custom-sized board", () => {
    const config: BoardConfig = { rows: 8, cols: 10, connectN: 5 };
    const board = createBoard(config);
    const col = getBotMove(board, 1, "medium", config);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(10);
  });
});
