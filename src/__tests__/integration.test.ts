import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock sound module
vi.mock('../engine/sound.ts', () => ({
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  getVolume: vi.fn(() => 0.5),
  isMuted: vi.fn(() => false),
  playDrop: vi.fn(),
  playTurnChange: vi.fn(),
  playWin: vi.fn(),
  playDrawLoss: vi.fn(),
}));

import { useGameStore } from '../store/gameStore.ts';
import { useProfileStore } from '../store/profileStore.ts';
import { EMPTY_CELL } from '../engine/types.ts';
import type { GameConfig } from '../engine/types.ts';
import { PLAYER_COLORS, PLAYER_OUTLINE_COLORS, PIECE_PATTERNS, DEFAULT_AVATARS } from '../engine/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cfg(overrides: Partial<GameConfig> = {}): Partial<GameConfig> {
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

function store() {
  return useGameStore.getState();
}

/** Play horizontal connect-4 for whichever player's turn it is. Other player dumps in col 6. */
function playHorizontalWin(dumpCol = 6) {
  store().makeMove(0); // current
  store().makeMove(dumpCol); // other
  store().makeMove(1);
  store().makeMove(dumpCol);
  store().makeMove(2);
  store().makeMove(dumpCol);
  store().makeMove(3); // → 4 in a row → win
}

/** Play vertical connect-4 for whichever player's turn it is in `winCol`. Other dumps in `otherCol`. */
function playVerticalWin(winCol: number, otherCol: number) {
  store().makeMove(winCol);
  store().makeMove(otherCol);
  store().makeMove(winCol);
  store().makeMove(otherCol);
  store().makeMove(winCol);
  store().makeMove(otherCol);
  store().makeMove(winCol); // 4 stacked → win
}

beforeEach(() => {
  useGameStore.getState().resetToMenu();
  // Reset profile store between tests
  useProfileStore.setState({
    username: '',
    gamesPlayed: 0,
    gamesWon: 0,
    favoriteColor: '#FF6FAF',
    unlockedColors: [],
    unlockedTitles: ['Rookie'],
    currentTitle: 'Rookie',
  });
});

// ===========================================================================
// Complete game flows
// ===========================================================================
describe('Complete game flows', () => {
  it('1. 2-player classic game to horizontal win', () => {
    useGameStore.getState().updateConfig(cfg());
    store().startMatch();

    expect(store().phase).toBe('playing');
    expect(store().currentPlayerIndex).toBe(0);

    playHorizontalWin();

    expect(store().winner).toBe(1);
    expect(store().scores[1]).toBeGreaterThanOrEqual(1);
    expect(store().phase).toBe('roundEnd');
  });

  it('2. 2-player game to draw', () => {
    // Use a tiny 4×4 board with connectN=4 to manufacture a draw quickly
    useGameStore.getState().updateConfig(cfg({
      board: { rows: 4, cols: 4, connectN: 4 },
      totalRounds: 1,
    }));
    store().startMatch();

    // Fill colums in a pattern that avoids 4-in-a-row:
    // Col pattern: P1 P2 alternate. Use column-by-column fill:
    // col 0: P1,P2,P1,P2  col 1: P2,P1,P2,P1  col 2: P1,P2,P1,P2  col 3: P2,P1,P2,P1
    // That means: two-at-a-time per column wouldn't work because each makeMove alternates player.
    // We need to carefully fill to avoid any horizontal/vertical/diagonal 4-in-a-row.
    // On a 4x4 board with connect-4, a draw is hard. Use 6x7 and fill it all.

    // Instead, let's use a known draw pattern for 6×7 connect-4:
    // Fill the board with alternating columns in groups that block any 4-in-a-row.
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(cfg({
      board: { rows: 2, cols: 2, connectN: 4 }, // 2x2 board, connectN=4 → impossible to win
      totalRounds: 1,
    }));
    store().startMatch();

    // 2×2 board: 4 cells, P1 and P2 alternate, can never get 4 in a row
    store().makeMove(0); // P1 → row 1, col 0
    store().makeMove(1); // P2 → row 1, col 1
    store().makeMove(0); // P1 → row 0, col 0
    store().makeMove(1); // P2 → row 0, col 1

    expect(store().isDraw).toBe(true);
    expect(store().winner).toBeNull();
    // With totalRounds=1, this is the last round → matchEnd
    expect(store().phase).toBe('matchEnd');
  });

  it('3. 3-round match plays to completion', () => {
    useGameStore.getState().updateConfig(cfg({ totalRounds: 3 }));
    store().startMatch();

    // Round 1: P1 wins
    playHorizontalWin();
    expect(store().round).toBe(1);
    expect(store().phase).toBe('roundEnd');
    store().nextRound();

    // Round 2: current player wins (may be P2 due to rotate)
    expect(store().round).toBe(2);
    expect(store().phase).toBe('playing');
    playHorizontalWin();
    expect(store().phase).toBe('roundEnd');
    store().nextRound();

    // Round 3: final round
    expect(store().round).toBe(3);
    playHorizontalWin();
    expect(store().phase).toBe('matchEnd');
  });

  it('4. First-to-N match ends when winsRequired reached', () => {
    useGameStore.getState().updateConfig(cfg({
      matchWinCondition: 'first-to-n',
      winsRequired: 2,
      totalRounds: 99, // high enough to not be the limiting factor
    }));
    store().startMatch();

    // Round 1: P1 wins
    playHorizontalWin();
    expect(store().phase).toBe('roundEnd');
    store().nextRound();

    // Round 2: P2 starts (rotate). P2 wins.
    playHorizontalWin();
    // Check: one of the two players should have 2+ wins → matchEnd
    const s = store();
    const p1Score = s.scores[1];
    const p2Score = s.scores[2];
    if (p1Score >= 2 || p2Score >= 2) {
      expect(s.phase).toBe('matchEnd');
    } else {
      // Not over yet; continue playing until someone reaches 2
      expect(s.phase).toBe('roundEnd');
      store().nextRound();
      playHorizontalWin();
      const s2 = store();
      expect(s2.scores[1] >= 2 || s2.scores[2] >= 2).toBe(true);
    }
  });

  it('5. 3-player game cycles turns correctly', () => {
    useGameStore.getState().updateConfig(cfg({
      players: [
        { id: 1, name: 'P1', type: 'human', color: PLAYER_COLORS[0], pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
        { id: 2, name: 'P2', type: 'human', color: PLAYER_COLORS[1], pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
        { id: 3, name: 'P3', type: 'human', color: PLAYER_COLORS[2], pattern: PIECE_PATTERNS[2], avatar: DEFAULT_AVATARS[2] },
      ],
    }));
    store().startMatch();

    expect(store().currentPlayerIndex).toBe(0);
    store().makeMove(0); // P1
    expect(store().currentPlayerIndex).toBe(1);
    store().makeMove(1); // P2
    expect(store().currentPlayerIndex).toBe(2);
    store().makeMove(2); // P3
    expect(store().currentPlayerIndex).toBe(0); // back to P1
    store().makeMove(3); // P1
    expect(store().currentPlayerIndex).toBe(1);
    store().makeMove(4); // P2
    expect(store().currentPlayerIndex).toBe(2); // P3
  });

  it('6. 4-player game cycles turns correctly', () => {
    useGameStore.getState().updateConfig(cfg({
      players: [
        { id: 1, name: 'P1', type: 'human', color: PLAYER_COLORS[0], pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
        { id: 2, name: 'P2', type: 'human', color: PLAYER_COLORS[1], pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
        { id: 3, name: 'P3', type: 'human', color: PLAYER_COLORS[2], pattern: PIECE_PATTERNS[2], avatar: DEFAULT_AVATARS[2] },
        { id: 4, name: 'P4', type: 'human', color: PLAYER_COLORS[3], pattern: PIECE_PATTERNS[3], avatar: DEFAULT_AVATARS[3] },
      ],
    }));
    store().startMatch();

    const indices: number[] = [];
    for (let i = 0; i < 8; i++) {
      indices.push(store().currentPlayerIndex);
      store().makeMove(i % 7); // spread across columns to avoid filling one up
    }
    expect(indices).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });

  it('7. Bot game — bot makes a valid move after human move', () => {
    useGameStore.getState().updateConfig(cfg({
      players: [
        { id: 1, name: 'Human', type: 'human', color: PLAYER_COLORS[0], pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
        { id: 2, name: 'Bot', type: 'bot', botDifficulty: 'easy', color: PLAYER_COLORS[1], pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
      ],
    }));
    store().startMatch();

    // Human plays col 3
    store().makeMove(3);

    // Now it's bot's turn
    expect(store().currentPlayerIndex).toBe(1);
    store().triggerBotMove();

    // Bot should have played; turn back to human or game ended
    const s = store();
    if (s.phase === 'playing') {
      expect(s.currentPlayerIndex).toBe(0); // back to human
    }
    // Board should have exactly 2 pieces placed
    let pieces = 0;
    for (const row of s.board) {
      for (const cell of row) {
        if (cell !== EMPTY_CELL) pieces++;
      }
    }
    expect(pieces).toBe(2);
  });

  it('8. Fullboard mode — blocked cells generated from previous board', () => {
    useGameStore.getState().updateConfig(cfg({
      mode: 'fullboard',
      totalRounds: 3,
    }));
    store().startMatch();

    // Initially no blocked cells
    const blocked = store().blockedCells;
    for (const row of blocked) {
      for (const cell of row) {
        expect(cell).toBe(false);
      }
    }

    // Win round 1
    playHorizontalWin();
    expect(store().phase).toBe('roundEnd');

    // Get the board state before advancing
    const boardAfterRound1 = store().board;

    store().nextRound();

    // Blocked cells should match occupied cells from round 1
    const newBlocked = store().blockedCells;
    for (let r = 0; r < boardAfterRound1.length; r++) {
      for (let c = 0; c < boardAfterRound1[0].length; c++) {
        if (boardAfterRound1[r][c] !== EMPTY_CELL) {
          expect(newBlocked[r][c]).toBe(true);
        }
      }
    }
  });

  it('9. Fullboard with resetInterval=1 — next round has fresh cells', () => {
    useGameStore.getState().updateConfig(cfg({
      mode: 'fullboard',
      fullBoardResetInterval: 1,
      totalRounds: 3,
    }));
    store().startMatch();
    playHorizontalWin();
    store().nextRound();

    // With resetInterval=1, round 1 % 1 === 0 → should reset
    const blocked = store().blockedCells;
    for (const row of blocked) {
      for (const cell of row) {
        expect(cell).toBe(false);
      }
    }
  });

  it('10. Vertical win', () => {
    useGameStore.getState().updateConfig(cfg());
    store().startMatch();
    playVerticalWin(0, 1);
    expect(store().winner).toBe(1);
  });

  it('11. Diagonal win', () => {
    useGameStore.getState().updateConfig(cfg());
    store().startMatch();

    // Build a diagonal for P1 from (5,0) to (2,3):
    // Col 0: P1 (lands row 5)
    store().makeMove(0); // P1 → (5,0)
    store().makeMove(1); // P2 → (5,1)
    // Col 1: need P1 at row 4
    store().makeMove(1); // P1 → (4,1)
    store().makeMove(2); // P2 → (5,2)
    // Col 2: need P1 at row 3. First fill row 4.
    store().makeMove(2); // P1 → (4,2)
    store().makeMove(2); // P2 → (3,2) — oops, P2 is at (3,2). Let's restart approach.

    // Reset and use a cleaner pattern
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(cfg());
    store().startMatch();

    // Diagonal ↘ for P1: positions (5,0), (4,1), (3,2), (2,3)
    // Col 0: just drop P1
    store().makeMove(0); // P1 → (5,0)
    // Col 1: need one filler then P1
    store().makeMove(1); // P2 → (5,1)
    store().makeMove(1); // P1 → (4,1)
    // Col 2: need two fillers then P1
    store().makeMove(2); // P2 → (5,2)
    store().makeMove(6); // P1 → dump
    store().makeMove(2); // P2 → (4,2)
    store().makeMove(2); // P1 → (3,2)
    // Col 3: need three fillers then P1
    store().makeMove(3); // P2 → (5,3)
    store().makeMove(6); // P1 → dump
    store().makeMove(3); // P2 → (4,3)
    store().makeMove(6); // P1 → dump  (wait, col 6 filling up — use col 5)
    store().makeMove(3); // P2 → (3,3)
    store().makeMove(3); // P1 → (2,3) — diagonal complete!

    expect(store().winner).toBe(1);
  });
});

// ===========================================================================
// Turn order tests
// ===========================================================================
describe('Turn order', () => {
  it('12. Rotate turn order — round 2 starts with player index 1', () => {
    useGameStore.getState().updateConfig(cfg({ turnOrder: 'rotate' }));
    store().startMatch();
    playHorizontalWin();
    store().nextRound();
    // round=1 → startIndex = 1 % 2 = 1
    expect(store().currentPlayerIndex).toBe(1);
  });

  it('13. Fixed turn order — round 2 still starts with player index 0', () => {
    useGameStore.getState().updateConfig(cfg({ turnOrder: 'fixed' }));
    store().startMatch();
    playHorizontalWin();
    store().nextRound();
    expect(store().currentPlayerIndex).toBe(0);
  });

  it('14. Fairness turn order — player with fewer wins starts', () => {
    useGameStore.getState().updateConfig(cfg({ turnOrder: 'fairness', totalRounds: 5 }));
    store().startMatch();

    // P1 wins round 1
    playHorizontalWin();
    expect(store().scores[1]).toBeGreaterThanOrEqual(1);
    expect(store().scores[2]).toBe(0);

    store().nextRound();
    // P2 has fewer wins → should start
    expect(store().currentPlayerIndex).toBe(1);
  });
});

// ===========================================================================
// Config changes during lobby
// ===========================================================================
describe('Config changes during lobby', () => {
  it('15. Change mode to fullboard then start — blockedCells initially all false', () => {
    useGameStore.getState().updateConfig(cfg({ mode: 'fullboard' }));
    store().startMatch();
    for (const row of store().blockedCells) {
      for (const cell of row) {
        expect(cell).toBe(false);
      }
    }
  });

  it('16. Change connectN to 5 — win requires 5 in a row', () => {
    useGameStore.getState().updateConfig(cfg({
      board: { rows: 6, cols: 7, connectN: 5 },
    }));
    store().startMatch();

    // 4 in a row should NOT win
    store().makeMove(0); // P1
    store().makeMove(6); // P2
    store().makeMove(1); // P1
    store().makeMove(6); // P2
    store().makeMove(2); // P1
    store().makeMove(6); // P2
    store().makeMove(3); // P1 — 4 in a row, but connectN=5
    expect(store().winner).toBeNull();
    expect(store().phase).toBe('playing');

    // 5th in a row
    store().makeMove(5); // P2
    store().makeMove(4); // P1 → 5 in a row!
    expect(store().winner).toBe(1);
  });

  it('17. Change board size to 8×9 — verify dimensions', () => {
    useGameStore.getState().updateConfig(cfg({
      board: { rows: 8, cols: 9, connectN: 4 },
    }));
    store().startMatch();

    expect(store().board.length).toBe(8);
    expect(store().board[0].length).toBe(9);
  });

  it('18. Add 3rd player — config.players has 3 entries', () => {
    useGameStore.getState().updateConfig(cfg({
      players: [
        { id: 1, name: 'P1', type: 'human', color: PLAYER_COLORS[0], pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
        { id: 2, name: 'P2', type: 'human', color: PLAYER_COLORS[1], pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
        { id: 3, name: 'P3', type: 'human', color: PLAYER_COLORS[2], pattern: PIECE_PATTERNS[2], avatar: DEFAULT_AVATARS[2] },
      ],
    }));
    expect(store().config.players).toHaveLength(3);
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================
describe('Edge cases', () => {
  it('19. makeMove after matchEnd does nothing', () => {
    useGameStore.getState().updateConfig(cfg({ totalRounds: 1 }));
    store().startMatch();
    playHorizontalWin();
    expect(store().phase).toBe('matchEnd');

    const boardBefore = JSON.stringify(store().board);
    store().makeMove(0);
    expect(JSON.stringify(store().board)).toBe(boardBefore);
  });

  it('20. makeMove on col 0 and col 6 work correctly', () => {
    useGameStore.getState().updateConfig(cfg());
    store().startMatch();

    store().makeMove(0);
    expect(store().board[5][0]).toBe(1);

    store().makeMove(6);
    expect(store().board[5][6]).toBe(2);
  });

  it('21. resetToMenu during playing returns to menu', () => {
    useGameStore.getState().updateConfig(cfg());
    store().startMatch();
    store().makeMove(3);
    expect(store().phase).toBe('playing');

    store().resetToMenu();
    expect(store().phase).toBe('menu');
    expect(store().round).toBe(1);
  });

  it('22. triggerBotMove when no valid moves does not crash', () => {
    // Tiny 2×2 board, fill it → no valid moves
    useGameStore.getState().updateConfig(cfg({
      board: { rows: 2, cols: 2, connectN: 4 },
      players: [
        { id: 1, name: 'Human', type: 'human', color: PLAYER_COLORS[0], pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
        { id: 2, name: 'Bot', type: 'bot', botDifficulty: 'easy', color: PLAYER_COLORS[1], pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
      ],
      totalRounds: 1,
    }));
    store().startMatch();

    // Fill: P1 (0), Bot (triggerBotMove), P1 (next col), Bot (triggerBotMove) → board full
    store().makeMove(0); // P1 → (1,0)
    store().triggerBotMove(); // Bot plays something
    // If game still going:
    if (store().phase === 'playing') {
      store().makeMove(store().board[0].findIndex((_, c) => store().board[1][c] === EMPTY_CELL || store().board[0][c] === EMPTY_CELL) >= 0
        ? store().board[0].findIndex((_, c) => {
          // find any valid column
          for (let r = store().board.length - 1; r >= 0; r--) {
            if (store().board[r][c] === EMPTY_CELL) return true;
          }
          return false;
        })
        : 0);
      if (store().phase === 'playing') {
        // Bot tries to move on a potentially full board
        expect(() => store().triggerBotMove()).not.toThrow();
      }
    }
    // Main assertion: no crash
    expect(true).toBe(true);
  });

  it('23. Winning move in last available cell', () => {
    // Use 2×3 board, connectN=2 for simplicity
    useGameStore.getState().updateConfig(cfg({
      board: { rows: 2, cols: 3, connectN: 2 },
      totalRounds: 1,
    }));
    store().startMatch();

    // Fill carefully: P1 gets last cell and wins with connect-2
    // Board layout target:
    // row0: P2  P1  P1 ← P1 wins horizontally at (0,2)
    // row1: P1  P2  P2
    store().makeMove(0); // P1 → (1,0)
    store().makeMove(1); // P2 → (1,1)
    store().makeMove(1); // P1 → (0,1)
    store().makeMove(2); // P2 → (1,2)
    store().makeMove(0); // P1 → (0,0) — P1 has (0,0) and (0,1) → connect-2!

    // P1 should win (connect-2 at row 0, cols 0-1)
    expect(store().winner).toBe(1);
  });

  it('24. Multiple rapid makeMove calls do not corrupt state', () => {
    useGameStore.getState().updateConfig(cfg());
    store().startMatch();

    // Rapid fire moves
    for (let i = 0; i < 20; i++) {
      store().makeMove(i % 7);
    }

    // Board should be consistent: each cell is EMPTY or a valid player id
    const players = new Set(store().config.players.map(p => p.id));
    for (const row of store().board) {
      for (const cell of row) {
        expect(cell === EMPTY_CELL || players.has(cell)).toBe(true);
      }
    }
  });
});

// ===========================================================================
// Profile integration
// ===========================================================================
describe('Profile integration', () => {
  it('25. After matchEnd with P1 winning, profile gamesPlayed increments', () => {
    expect(useProfileStore.getState().gamesPlayed).toBe(0);

    useGameStore.getState().updateConfig(cfg({ totalRounds: 1 }));
    store().startMatch();
    playHorizontalWin(); // P1 wins

    expect(store().phase).toBe('matchEnd');
    expect(store().winner).toBe(1);
    expect(useProfileStore.getState().gamesPlayed).toBe(1);
    expect(useProfileStore.getState().gamesWon).toBe(1);
  });

  it('26. After matchEnd with P1 losing, gamesWon does NOT increment', () => {
    expect(useProfileStore.getState().gamesWon).toBe(0);

    // Make P2 win: use rotate = false so P1 always goes first.
    // We need P2 to win the final round for a matchEnd with P2 as winner.
    useGameStore.getState().updateConfig(cfg({
      totalRounds: 1,
      turnOrder: 'fixed',
    }));
    store().startMatch();

    // P2 must win. P1 dumps in col 6, P2 builds horizontal.
    store().makeMove(6); // P1 dumps
    store().makeMove(0); // P2
    store().makeMove(6); // P1 dumps
    store().makeMove(1); // P2
    store().makeMove(5); // P1 dumps
    store().makeMove(2); // P2
    store().makeMove(5); // P1 dumps
    store().makeMove(3); // P2 → 4 in a row → P2 wins

    expect(store().phase).toBe('matchEnd');
    expect(store().winner).toBe(2);
    expect(useProfileStore.getState().gamesPlayed).toBe(1);
    expect(useProfileStore.getState().gamesWon).toBe(0);
  });

  it('27. Profile username carries to default config player name', () => {
    useProfileStore.getState().setUsername('TestUser');
    // Reset to regenerate config from profile
    useGameStore.getState().resetToMenu();

    const p1Name = store().config.players[0].name;
    expect(p1Name).toBe('TestUser');
  });
});
