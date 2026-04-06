import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../store/gameStore.ts';
import { useProfileStore } from '../store/profileStore.ts';
import type { GameConfig } from '../engine/types.ts';
import { PLAYER_COLORS, PLAYER_OUTLINE_COLORS, PIECE_PATTERNS, DEFAULT_AVATARS } from '../engine/types.ts';
import { createBoard, isBoardFull, createBlockedGrid } from '../engine/board.ts';
import { checkWinAtPosition, calculateRoundBonus } from '../engine/winDetection.ts';
import { getBotMove } from '../engine/bot.ts';

// Mock sound module
vi.mock('../engine/sound.ts', () => ({
  playDrop: vi.fn(),
  playTurnChange: vi.fn(),
  playWin: vi.fn(),
  playDrawLoss: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  getVolume: () => 0.5,
  isMuted: () => false,
}));

function make2PlayerConfig(overrides: Partial<GameConfig> = {}): Partial<GameConfig> {
  return {
    board: { rows: 6, cols: 7, connectN: 4 },
    mode: 'classic',
    matchType: 'local',
    players: [
      { id: 1, name: 'P1', type: 'human', color: PLAYER_COLORS[0], outlineColor: PLAYER_OUTLINE_COLORS[0], pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
      { id: 2, name: 'P2', type: 'human', color: PLAYER_COLORS[1], outlineColor: PLAYER_OUTLINE_COLORS[1], pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
    ],
    totalRounds: 3,
    matchWinCondition: 'fixed-rounds',
    winsRequired: 3,
    fullBoardResetInterval: 0,
    turnOrder: 'rotate',
    randomizeTurnOrder: false,
    ...overrides,
  };
}

function playVerticalWin(store: typeof useGameStore, winCol: number, otherCol: number) {
  store.getState().makeMove(winCol);
  store.getState().makeMove(otherCol);
  store.getState().makeMove(winCol);
  store.getState().makeMove(otherCol);
  store.getState().makeMove(winCol);
  store.getState().makeMove(otherCol);
  store.getState().makeMove(winCol);
}

// ─── Match end scoring edge cases ────────────────────────────────────────────

describe('Match end scoring', () => {
  beforeEach(() => {
    useGameStore.getState().resetToMenu();
  });

  it('winner score includes bonus for multi-alignment', () => {
    // Build a board where the win creates two connect-N lines
    const board = createBoard({ rows: 6, cols: 7, connectN: 4 });
    // Horizontal 4 at row 5
    board[5][0] = 1; board[5][1] = 1; board[5][2] = 1; board[5][3] = 1;
    // Vertical 4 at col 3
    board[4][3] = 1; board[3][3] = 1; board[2][3] = 1;
    // Position (5,3) is the intersection

    const bonus = calculateRoundBonus(board, 5, 3, 4, [], 1);
    expect(bonus).toBe(1); // 2 lines - 1
  });

  it('streak bonus accumulates across consecutive wins', () => {
    const board = createBoard();
    board[5][0] = 1; board[5][1] = 1; board[5][2] = 1; board[5][3] = 1;

    const results = [
      { roundNumber: 1, winner: 1 as number, draw: false, board: createBoard() },
      { roundNumber: 2, winner: 1 as number, draw: false, board: createBoard() },
      { roundNumber: 3, winner: 1 as number, draw: false, board: createBoard() },
    ];

    const bonus = calculateRoundBonus(board, 5, 3, 4, results, 1);
    expect(bonus).toBe(3); // 3 consecutive prior wins
  });

  it('streak resets after a loss or draw', () => {
    const board = createBoard();
    board[5][0] = 1; board[5][1] = 1; board[5][2] = 1; board[5][3] = 1;

    const results = [
      { roundNumber: 1, winner: 1 as number, draw: false, board: createBoard() },
      { roundNumber: 2, winner: null, draw: true, board: createBoard() },
      { roundNumber: 3, winner: 1 as number, draw: false, board: createBoard() },
    ];

    const bonus = calculateRoundBonus(board, 5, 3, 4, results, 1);
    expect(bonus).toBe(1); // only 1 consecutive win (round 3)
  });

  it('profile records win on match end for human player 1', () => {
    const initialPlayed = useProfileStore.getState().gamesPlayed;

    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 1 }));
    useGameStore.getState().startMatch();
    playVerticalWin(useGameStore, 0, 1);

    expect(useGameStore.getState().phase).toBe('matchEnd');
    const profile = useProfileStore.getState();
    expect(profile.gamesPlayed).toBe(initialPlayed + 1);
  });
});

// ─── Round transition edge cases ─────────────────────────────────────────────

describe('Round transitions', () => {
  beforeEach(() => {
    useGameStore.getState().resetToMenu();
  });

  it('scores persist across rounds', () => {
    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 3 }));
    useGameStore.getState().startMatch();

    playVerticalWin(useGameStore, 0, 1); // P1 wins round 1
    const scoreAfterR1 = useGameStore.getState().scores[1];
    expect(scoreAfterR1).toBeGreaterThanOrEqual(1);

    useGameStore.getState().nextRound();
    // Scores should be preserved
    expect(useGameStore.getState().scores[1]).toBe(scoreAfterR1);
  });

  it('roundResults accumulate', () => {
    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 3 }));
    useGameStore.getState().startMatch();

    playVerticalWin(useGameStore, 0, 1);
    expect(useGameStore.getState().roundResults.length).toBe(1);

    useGameStore.getState().nextRound();
    playVerticalWin(useGameStore, 2, 3);
    expect(useGameStore.getState().roundResults.length).toBe(2);
  });

  it('moveHistory resets each round', () => {
    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 3 }));
    useGameStore.getState().startMatch();

    playVerticalWin(useGameStore, 0, 1);
    expect(useGameStore.getState().moveHistory.length).toBe(7);

    useGameStore.getState().nextRound();
    expect(useGameStore.getState().moveHistory).toEqual([]);
  });

  it('draw round does not increment any score', () => {
    useGameStore.getState().updateConfig(make2PlayerConfig({
      board: { rows: 2, cols: 2, connectN: 3 },
      totalRounds: 2,
    }));
    useGameStore.getState().startMatch();

    useGameStore.getState().makeMove(0);
    useGameStore.getState().makeMove(1);
    useGameStore.getState().makeMove(1);
    useGameStore.getState().makeMove(0);

    const scores = useGameStore.getState().scores;
    expect(scores[1]).toBe(0);
    expect(scores[2]).toBe(0);
    expect(useGameStore.getState().isDraw).toBe(true);
  });
});

// ─── Bot in fullboard mode edge cases ────────────────────────────────────────

describe('Bot in fullboard mode — edge cases', () => {
  it('hard bot still finds winning moves with blocked cells', () => {
    const config = { rows: 6, cols: 7, connectN: 4 };
    const board = createBoard(config);
    const blocked = createBlockedGrid(config);

    // P1 has 3 in a row at bottom: cols 0,1,2
    board[5][0] = 1; blocked[5][0] = true;
    board[5][1] = 1; blocked[5][1] = true;
    board[5][2] = 1; blocked[5][2] = true;
    // Col 3 bottom is open → winning move for P1

    const move = getBotMove(board, 1, 'hard', config, blocked);
    // Hard bot should find the winning move at col 3
    expect(move).toBe(3);
  });

  it('bot handles almost-full board', () => {
    const config = { rows: 3, cols: 3, connectN: 3 };
    const board = createBoard(config);

    // Fill cols 0 and 1 completely, leave col 2 open
    board[0][0] = 1; board[0][1] = 2;
    board[1][0] = 2; board[1][1] = 1;
    board[2][0] = 1; board[2][1] = 2;
    // Col 2 is the only valid column

    const move = getBotMove(board, 1, 'easy', config);
    expect(move).toBe(2);
  });
});

// ─── Win detection edge cases ────────────────────────────────────────────────

describe('Win detection edge cases', () => {
  it('no false win on partially filled diagonal', () => {
    const board = createBoard({ rows: 6, cols: 7, connectN: 4 });
    board[5][0] = 1;
    board[4][1] = 1;
    board[3][2] = 1;
    // Only 3 in diagonal — not a win
    const result = checkWinAtPosition(board, 3, 2, 4);
    expect(result).toBeNull();
  });

  it('detects win at board edge (top-left corner)', () => {
    const board = createBoard({ rows: 6, cols: 7, connectN: 4 });
    board[0][0] = 1;
    board[0][1] = 1;
    board[0][2] = 1;
    board[0][3] = 1;
    const result = checkWinAtPosition(board, 0, 3, 4);
    expect(result).toBe(1);
  });

  it('detects win at board edge (bottom-right corner)', () => {
    const board = createBoard({ rows: 6, cols: 7, connectN: 4 });
    board[5][3] = 2;
    board[5][4] = 2;
    board[5][5] = 2;
    board[5][6] = 2;
    const result = checkWinAtPosition(board, 5, 6, 4);
    expect(result).toBe(2);
  });

  it('connect-5 on a medium board', () => {
    const config = { rows: 8, cols: 9, connectN: 5 };
    const board = createBoard(config);
    for (let i = 0; i < 5; i++) board[7][i] = 1;
    const result = checkWinAtPosition(board, 7, 4, 5);
    expect(result).toBe(1);
  });

  it('connect-6 on a big board', () => {
    const config = { rows: 10, cols: 12, connectN: 6 };
    const board = createBoard(config);
    for (let i = 0; i < 6; i++) board[9][i] = 1;
    const result = checkWinAtPosition(board, 9, 0, 6);
    expect(result).toBe(1);
  });

  it('does not detect win for empty cell', () => {
    const board = createBoard({ rows: 6, cols: 7, connectN: 4 });
    const result = checkWinAtPosition(board, 0, 0, 4);
    expect(result).toBeNull();
  });
});

// ─── isBoardFull edge cases ──────────────────────────────────────────────────

describe('isBoardFull edge cases', () => {
  it('returns true when top row is full even if lower cells are empty', () => {
    // In Connect-4 gravity, if top row is occupied, no new pieces can enter
    const board = createBoard({ rows: 2, cols: 2, connectN: 4 });
    board[0][0] = 1; board[0][1] = 2;
    // bottom row is empty, but board is "full" because no column has an empty top
    expect(isBoardFull(board)).toBe(true);
  });

  it('returns false when at least one top cell is empty', () => {
    const board = createBoard({ rows: 2, cols: 2, connectN: 4 });
    board[0][0] = 1; // top-left occupied
    board[1][0] = 2;
    board[1][1] = 1;
    // board[0][1] is empty → col 1 is valid
    expect(isBoardFull(board)).toBe(false);
  });

  it('fully occupied board is full', () => {
    const board = createBoard({ rows: 2, cols: 2, connectN: 4 });
    board[0][0] = 1; board[0][1] = 2;
    board[1][0] = 2; board[1][1] = 1;
    expect(isBoardFull(board)).toBe(true);
  });
});

// ─── Large board with Connect-7 ──────────────────────────────────────────────

describe('Epic board (14x16, Connect-7)', () => {
  it('creates correct board dimensions', () => {
    const board = createBoard({ rows: 14, cols: 16, connectN: 7 });
    expect(board.length).toBe(14);
    expect(board[0].length).toBe(16);
  });

  it('detects connect-7 win', () => {
    const config = { rows: 14, cols: 16, connectN: 7 };
    const board = createBoard(config);
    for (let i = 0; i < 7; i++) board[13][i] = 1;
    expect(checkWinAtPosition(board, 13, 6, 7)).toBe(1);
  });

  it('bot operates on large board without error', () => {
    const config = { rows: 14, cols: 16, connectN: 7 };
    const board = createBoard(config);
    // Use easy bot to avoid long computation times
    const move = getBotMove(board, 1, 'easy', config);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(16);
  });
});
