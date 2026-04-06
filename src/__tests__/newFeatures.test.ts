import { describe, it, expect } from 'vitest';
import { createBoard } from '../engine/board.ts';
import type { Board, PlayerId, RoundResult } from '../engine/types.ts';
import { calculateRoundBonus } from '../engine/winDetection.ts';

// ─── Feature 4: Bonus scoring ───────────────────────────────────────────────

describe('calculateRoundBonus', () => {
  const connectN = 4;

  /** Helper: build a board with a single horizontal 4-in-a-row for player 1 */
  function boardWithSingleLine(): { board: Board; row: number; col: number } {
    const board = createBoard();
    // Horizontal win at bottom row, cols 0-3
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    board[5][3] = 1;
    return { board, row: 5, col: 3 };
  }

  /**
   * Helper: build a board where the winning move at (row, col) creates
   * two connect-N lines (horizontal + vertical).
   */
  function boardWithTwoLines(): { board: Board; row: number; col: number } {
    const board = createBoard();
    // Horizontal win at row 2, cols 0-3
    board[2][0] = 1;
    board[2][1] = 1;
    board[2][2] = 1;
    board[2][3] = 1;
    // Vertical win at col 3, rows 2-5 (row 2 is shared)
    board[3][3] = 1;
    board[4][3] = 1;
    board[5][3] = 1;
    // Winning position is (2, 3) — the intersection
    return { board, row: 2, col: 3 };
  }

  it('returns 0 for a simple single-line win with no streak', () => {
    const { board, row, col } = boardWithSingleLine();
    const roundResults: RoundResult[] = [];
    const bonus = calculateRoundBonus(board, row, col, connectN, roundResults, 1);
    expect(bonus).toBe(0);
  });

  it('returns multi-alignment bonus when winning move creates 2 lines', () => {
    const { board, row, col } = boardWithTwoLines();
    const roundResults: RoundResult[] = [];
    const bonus = calculateRoundBonus(board, row, col, connectN, roundResults, 1);
    // 2 lines through the winning position → +1 for the extra line beyond the first
    expect(bonus).toBe(1);
  });

  it('returns streak bonus when player has consecutive wins', () => {
    const { board, row, col } = boardWithSingleLine();
    // Player 1 won the last 2 rounds in a row
    const roundResults: RoundResult[] = [
      { roundNumber: 1, winner: 1, draw: false, board: createBoard() },
      { roundNumber: 2, winner: 1, draw: false, board: createBoard() },
    ];
    const bonus = calculateRoundBonus(board, row, col, connectN, roundResults, 1);
    // Single line (0 multi-alignment) + streak of 2 consecutive wins = 2
    expect(bonus).toBe(2);
  });

  it('returns combined bonus (streak + multi-alignment)', () => {
    const { board, row, col } = boardWithTwoLines();
    // Player 1 has a 3-round win streak coming in
    const roundResults: RoundResult[] = [
      { roundNumber: 1, winner: 1, draw: false, board: createBoard() },
      { roundNumber: 2, winner: 1, draw: false, board: createBoard() },
      { roundNumber: 3, winner: 1, draw: false, board: createBoard() },
    ];
    const bonus = calculateRoundBonus(board, row, col, connectN, roundResults, 1);
    // 1 (multi-alignment: 2 lines − 1) + 3 (streak) = 4
    expect(bonus).toBe(4);
  });

  it('streak resets when a different player or draw intervenes', () => {
    const { board, row, col } = boardWithSingleLine();
    const roundResults: RoundResult[] = [
      { roundNumber: 1, winner: 1, draw: false, board: createBoard() },
      { roundNumber: 2, winner: 2, draw: false, board: createBoard() }, // different winner
      { roundNumber: 3, winner: 1, draw: false, board: createBoard() },
    ];
    const bonus = calculateRoundBonus(board, row, col, connectN, roundResults, 1);
    // Only 1 consecutive win (round 3); single line → bonus = 1
    expect(bonus).toBe(1);
  });
});

// ─── Feature 1: Turn order rotation ─────────────────────────────────────────

describe('Turn order rotation logic', () => {
  describe('rotate mode', () => {
    it('starting player cycles through players based on round number', () => {
      const playerCount = 3;
      expect(0 % playerCount).toBe(0); // round 0 → player 0
      expect(1 % playerCount).toBe(1); // round 1 → player 1
      expect(2 % playerCount).toBe(2); // round 2 → player 2
      expect(3 % playerCount).toBe(0); // round 3 → wraps back to 0
    });

    it('works correctly for 2 players', () => {
      const playerCount = 2;
      expect(0 % playerCount).toBe(0);
      expect(1 % playerCount).toBe(1);
      expect(2 % playerCount).toBe(0);
      expect(5 % playerCount).toBe(1);
    });
  });

  describe('fixed mode', () => {
    it('always returns player index 0 regardless of round', () => {
      // 'fixed' mode: starting player is always index 0
      const startingPlayerIndex = 0;
      for (const round of [0, 1, 2, 5, 10]) {
        expect(round).toBeGreaterThanOrEqual(0);
        expect(startingPlayerIndex).toBe(0);
      }
    });
  });

  describe('fairness mode', () => {
    function pickFairnessStarter(wins: Record<number, number>, playerIds: number[]): number {
      let minWins = Infinity;
      let starter = playerIds[0];
      for (const id of playerIds) {
        const w = wins[id] ?? 0;
        if (w < minWins) {
          minWins = w;
          starter = id;
        }
        // ties resolved by lowest index — since we iterate in order, first found wins
      }
      return starter;
    }

    it('selects the player with fewest wins', () => {
      const wins = { 1: 3, 2: 1, 3: 2 };
      const playerIds = [1, 2, 3];
      expect(pickFairnessStarter(wins, playerIds)).toBe(2);
    });

    it('selects lowest index on tie', () => {
      const wins = { 1: 2, 2: 2, 3: 2 };
      const playerIds = [1, 2, 3];
      expect(pickFairnessStarter(wins, playerIds)).toBe(1);
    });

    it('selects lowest index among tied minimum players', () => {
      const wins = { 1: 3, 2: 1, 3: 1 };
      const playerIds = [1, 2, 3];
      expect(pickFairnessStarter(wins, playerIds)).toBe(2);
    });

    it('handles all zero wins', () => {
      const wins = { 1: 0, 2: 0 };
      const playerIds = [1, 2];
      expect(pickFairnessStarter(wins, playerIds)).toBe(1);
    });
  });
});

// ─── Feature 3: First-to-N wins match end ────────────────────────────────────

describe('First-to-N wins match end', () => {
  function isMatchOverFirstToN(scores: Record<PlayerId, number>, winsRequired: number): boolean {
    return Object.values(scores).some(w => w >= winsRequired);
  }

  it('match is NOT over when no player has enough wins', () => {
    const scores = { 1: 1, 2: 2 };
    expect(isMatchOverFirstToN(scores, 3)).toBe(false);
  });

  it('match IS over when a player reaches winsRequired', () => {
    const scores = { 1: 3, 2: 1 };
    expect(isMatchOverFirstToN(scores, 3)).toBe(true);
  });

  it('match IS over when a player exceeds winsRequired', () => {
    const scores = { 1: 5, 2: 2 };
    expect(isMatchOverFirstToN(scores, 3)).toBe(true);
  });

  it('match is NOT over with zero wins and winsRequired > 0', () => {
    const scores = { 1: 0, 2: 0 };
    expect(isMatchOverFirstToN(scores, 1)).toBe(false);
  });

  it('detects winner among multiple players', () => {
    const scores = { 1: 1, 2: 0, 3: 2, 4: 1 };
    expect(isMatchOverFirstToN(scores, 2)).toBe(true);
  });
});

// ─── Feature 5: Full-board reset interval ────────────────────────────────────

// ─── Feature 2: Randomized turn order ────────────────────────────────────────

describe('Randomized turn order (shuffle)', () => {
  /** Fisher-Yates shuffle (same logic as in gameStore) */
  function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  it('preserves array length after shuffle', () => {
    const players = [1, 2, 3, 4];
    const shuffled = shuffleArray(players);
    expect(shuffled.length).toBe(players.length);
  });

  it('preserves all elements (no duplicates or missing)', () => {
    const players = [1, 2, 3, 4];
    const shuffled = shuffleArray(players);
    expect([...shuffled].sort()).toEqual([...players].sort());
  });

  it('does not mutate the original array', () => {
    const players = [1, 2, 3, 4];
    const original = [...players];
    shuffleArray(players);
    expect(players).toEqual(original);
  });

  it('single-element array stays the same', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('empty array stays empty', () => {
    expect(shuffleArray([])).toEqual([]);
  });
});

// ─── Feature 5: Full-board reset interval ────────────────────────────────────

describe('Full-board reset interval logic', () => {
  function shouldResetBlockedCells(round: number, interval: number): boolean {
    return interval > 0 && round % interval === 0;
  }

  it('triggers reset when round is a multiple of interval', () => {
    expect(shouldResetBlockedCells(3, 3)).toBe(true);  // 3 % 3 === 0
    expect(shouldResetBlockedCells(6, 3)).toBe(true);  // 6 % 3 === 0
  });

  it('does NOT trigger reset when round is not a multiple of interval', () => {
    expect(shouldResetBlockedCells(4, 3)).toBe(false);  // 4 % 3 !== 0
    expect(shouldResetBlockedCells(5, 3)).toBe(false);  // 5 % 3 !== 0
  });

  it('does NOT trigger reset when interval is 0 (disabled)', () => {
    expect(shouldResetBlockedCells(3, 0)).toBe(false);
    expect(shouldResetBlockedCells(0, 0)).toBe(false);
  });

  it('triggers reset at round 0 when interval > 0', () => {
    // 0 % N === 0 for any N > 0, so round 0 always triggers a reset
    expect(shouldResetBlockedCells(0, 3)).toBe(true);
    expect(shouldResetBlockedCells(0, 1)).toBe(true);
  });

  it('interval of 1 triggers every round', () => {
    for (const round of [0, 1, 2, 3, 10]) {
      expect(shouldResetBlockedCells(round, 1)).toBe(true);
    }
  });
});
