import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the sound module since Web Audio API isn't available in jsdom
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
import type { GamePhase, GameConfig } from '../engine/types.ts';
import { PLAYER_COLORS, PLAYER_OUTLINE_COLORS, PIECE_PATTERNS, DEFAULT_AVATARS } from '../engine/types.ts';

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

/** Helper: P1 wins via vertical connect-4 (winCol) while P2 uses otherCol */
function playVerticalWin(winCol: number, otherCol: number) {
  useGameStore.getState().makeMove(winCol);   // P1
  useGameStore.getState().makeMove(otherCol); // P2
  useGameStore.getState().makeMove(winCol);   // P1
  useGameStore.getState().makeMove(otherCol); // P2
  useGameStore.getState().makeMove(winCol);   // P1
  useGameStore.getState().makeMove(otherCol); // P2
  useGameStore.getState().makeMove(winCol);   // P1 → connect 4!
}

/** Helper: P1 wins via horizontal connect-4 (cols 0-3) while P2 stacks col 6 */
function playHorizontalWin() {
  useGameStore.getState().makeMove(0); // P1
  useGameStore.getState().makeMove(6); // P2
  useGameStore.getState().makeMove(1); // P1
  useGameStore.getState().makeMove(6); // P2
  useGameStore.getState().makeMove(2); // P1
  useGameStore.getState().makeMove(6); // P2
  useGameStore.getState().makeMove(3); // P1 → wins
}

beforeEach(() => {
  useGameStore.getState().resetToMenu();
});

// ---------------------------------------------------------------------------
// Phase management
// ---------------------------------------------------------------------------
describe('Phase management', () => {
  it('1. Initial phase is menu', () => {
    expect(useGameStore.getState().phase).toBe('menu');
  });

  it('2. setPhase("lobby") changes phase to lobby', () => {
    useGameStore.getState().setPhase('lobby');
    expect(useGameStore.getState().phase).toBe('lobby');
  });

  it('3. setPhase("playing") changes phase to playing', () => {
    useGameStore.getState().setPhase('playing');
    expect(useGameStore.getState().phase).toBe('playing');
  });

  it('4. All valid phases work', () => {
    const phases: GamePhase[] = ['menu', 'lobby', 'settings', 'playing', 'roundEnd', 'matchEnd'];
    for (const p of phases) {
      useGameStore.getState().setPhase(p);
      expect(useGameStore.getState().phase).toBe(p);
    }
  });
});

// ---------------------------------------------------------------------------
// Config management
// ---------------------------------------------------------------------------
describe('Config management', () => {
  it('5. Default config has correct mode (classic)', () => {
    expect(useGameStore.getState().config.mode).toBe('classic');
  });

  it('6. Default config has 2 players', () => {
    expect(useGameStore.getState().config.players).toHaveLength(2);
  });

  it('7. Default config has totalRounds = 3', () => {
    expect(useGameStore.getState().config.totalRounds).toBe(3);
  });

  it('8. updateConfig({ mode: "fullboard" }) updates mode', () => {
    useGameStore.getState().updateConfig({ mode: 'fullboard' });
    expect(useGameStore.getState().config.mode).toBe('fullboard');
  });

  it('9. updateConfig({ totalRounds: 5 }) updates rounds', () => {
    useGameStore.getState().updateConfig({ totalRounds: 5 });
    expect(useGameStore.getState().config.totalRounds).toBe(5);
  });

  it('10. updateConfig preserves other config fields', () => {
    const originalPlayers = useGameStore.getState().config.players;
    useGameStore.getState().updateConfig({ totalRounds: 7 });
    const s = useGameStore.getState();
    expect(s.config.mode).toBe('classic');
    expect(s.config.players).toEqual(originalPlayers);
    expect(s.config.board).toEqual({ rows: 6, cols: 7, connectN: 4 });
  });

  it('11. Update players array', () => {
    const newPlayers = [
      { id: 1, name: 'Alice', type: 'human' as const, color: '#ff0000', pattern: 'solid' as const, avatar: 'cat' as const },
      { id: 2, name: 'Bob', type: 'human' as const, color: '#0000ff', pattern: 'stripe' as const, avatar: 'dog' as const },
      { id: 3, name: 'Charlie', type: 'human' as const, color: '#00ff00', pattern: 'dot' as const, avatar: 'bear' as const },
    ];
    useGameStore.getState().updateConfig({ players: newPlayers });
    expect(useGameStore.getState().config.players).toHaveLength(3);
    expect(useGameStore.getState().config.players[2].name).toBe('Charlie');
  });

  it('12. Update board config (connectN, rows, cols)', () => {
    useGameStore.getState().updateConfig({ board: { rows: 8, cols: 9, connectN: 5 } });
    const board = useGameStore.getState().config.board;
    expect(board.rows).toBe(8);
    expect(board.cols).toBe(9);
    expect(board.connectN).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Match start
// ---------------------------------------------------------------------------
describe('Match start', () => {
  it('13. startMatch sets phase to playing', () => {
    useGameStore.getState().startMatch();
    expect(useGameStore.getState().phase).toBe('playing');
  });

  it('14. startMatch creates fresh board', () => {
    useGameStore.getState().startMatch();
    const { board, config } = useGameStore.getState();
    expect(board).toHaveLength(config.board.rows);
    expect(board[0]).toHaveLength(config.board.cols);
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBe(0);
      }
    }
  });

  it('15. startMatch resets scores to 0', () => {
    useGameStore.getState().startMatch();
    const { scores, config } = useGameStore.getState();
    for (const p of config.players) {
      expect(scores[p.id]).toBe(0);
    }
  });

  it('16. startMatch sets round to 1', () => {
    useGameStore.getState().startMatch();
    expect(useGameStore.getState().round).toBe(1);
  });

  it('17. startMatch resets moveHistory', () => {
    useGameStore.getState().startMatch();
    expect(useGameStore.getState().moveHistory).toEqual([]);
  });

  it('18. startMatch initializes blockedCells', () => {
    useGameStore.getState().startMatch();
    const { blockedCells, config } = useGameStore.getState();
    expect(blockedCells).toHaveLength(config.board.rows);
    expect(blockedCells[0]).toHaveLength(config.board.cols);
    for (const row of blockedCells) {
      for (const cell of row) {
        expect(cell).toBe(false);
      }
    }
  });

  it('19. startMatch with randomizeTurnOrder shuffles players (preserves set)', () => {
    useGameStore.getState().updateConfig({ randomizeTurnOrder: true });
    const originalIds = useGameStore.getState().config.players.map(p => p.id).sort();
    useGameStore.getState().startMatch();
    const newIds = useGameStore.getState().config.players.map(p => p.id).sort();
    expect(newIds).toEqual(originalIds);
  });

  it('20. startMatch with 3 players creates correct scores object', () => {
    useGameStore.getState().updateConfig({
      players: [
        { id: 1, name: 'P1', type: 'human', color: '#f00', pattern: 'solid', avatar: 'cat' },
        { id: 2, name: 'P2', type: 'human', color: '#0f0', pattern: 'stripe', avatar: 'dog' },
        { id: 3, name: 'P3', type: 'human', color: '#00f', pattern: 'dot', avatar: 'bear' },
      ],
    });
    useGameStore.getState().startMatch();
    const { scores } = useGameStore.getState();
    expect(Object.keys(scores)).toHaveLength(3);
    expect(scores[1]).toBe(0);
    expect(scores[2]).toBe(0);
    expect(scores[3]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Making moves
// ---------------------------------------------------------------------------
describe('Making moves', () => {
  beforeEach(() => {
    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 3 }));
    useGameStore.getState().startMatch();
  });

  it('21. makeMove places piece in correct column', () => {
    useGameStore.getState().makeMove(3);
    const { board, config } = useGameStore.getState();
    expect(board[config.board.rows - 1][3]).toBe(1);
  });

  it('22. makeMove advances currentPlayerIndex', () => {
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);
    useGameStore.getState().makeMove(0);
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
  });

  it('23. makeMove adds to moveHistory', () => {
    useGameStore.getState().makeMove(2);
    const { moveHistory, config } = useGameStore.getState();
    expect(moveHistory).toHaveLength(1);
    expect(moveHistory[0]).toEqual({
      row: config.board.rows - 1,
      col: 2,
      player: config.players[0].id,
    });
  });

  it('24. makeMove does nothing if phase is not playing', () => {
    useGameStore.getState().setPhase('menu');
    const boardBefore = useGameStore.getState().board;
    useGameStore.getState().makeMove(0);
    expect(useGameStore.getState().board).toEqual(boardBefore);
  });

  it('25. Multiple moves cycle through 2 players correctly', () => {
    const playerIds = useGameStore.getState().config.players.map(p => p.id);
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P1
    useGameStore.getState().makeMove(3); // P2
    const { board, config } = useGameStore.getState();
    const bottomRow = config.board.rows - 1;
    expect(board[bottomRow][0]).toBe(playerIds[0]);
    expect(board[bottomRow][1]).toBe(playerIds[1]);
    expect(board[bottomRow][2]).toBe(playerIds[0]);
    expect(board[bottomRow][3]).toBe(playerIds[1]);
  });

  it('26. Multiple moves cycle through 3 players correctly', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig({
      ...make2PlayerConfig(),
      players: [
        { id: 1, name: 'P1', type: 'human', color: '#f00', pattern: 'solid', avatar: 'cat' },
        { id: 2, name: 'P2', type: 'human', color: '#0f0', pattern: 'stripe', avatar: 'dog' },
        { id: 3, name: 'P3', type: 'human', color: '#00f', pattern: 'dot', avatar: 'bear' },
      ],
    });
    useGameStore.getState().startMatch();

    useGameStore.getState().makeMove(0); // P1
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    useGameStore.getState().makeMove(1); // P2
    expect(useGameStore.getState().currentPlayerIndex).toBe(2);
    useGameStore.getState().makeMove(2); // P3
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);
  });

  it('27. makeMove on full column does nothing', () => {
    // Fill col 0 by alternating col0 and col1 to avoid vertical 4-in-a-row
    // P1→col0, P2→col1, P1→col0, P2→col1 ... (6 rows each)
    const { config } = useGameStore.getState();
    for (let i = 0; i < config.board.rows; i++) {
      useGameStore.getState().makeMove(0);
      if (useGameStore.getState().phase !== 'playing') break;
      useGameStore.getState().makeMove(1);
      if (useGameStore.getState().phase !== 'playing') break;
    }
    if (useGameStore.getState().phase === 'playing') {
      const movesBefore = useGameStore.getState().moveHistory.length;
      useGameStore.getState().makeMove(0); // col 0 should be full
      expect(useGameStore.getState().moveHistory.length).toBe(movesBefore);
    }
  });

  it('28. Win detection: horizontal 4 in a row', () => {
    playHorizontalWin();
    const s = useGameStore.getState();
    expect(s.winner).toBe(s.config.players[0].id);
  });

  it('29. Win sets phase to roundEnd (not matchEnd for round 1/3)', () => {
    playHorizontalWin();
    expect(useGameStore.getState().phase).toBe('roundEnd');
  });

  it('30. Win updates scores', () => {
    playHorizontalWin();
    const { scores, config } = useGameStore.getState();
    expect(scores[config.players[0].id]).toBeGreaterThanOrEqual(1);
  });

  it('31. Win stores roundResult', () => {
    playHorizontalWin();
    const { roundResults, config } = useGameStore.getState();
    expect(roundResults).toHaveLength(1);
    expect(roundResults[0].roundNumber).toBe(1);
    expect(roundResults[0].winner).toBe(config.players[0].id);
    expect(roundResults[0].draw).toBe(false);
  });

  it('32. Draw detection: fill board without winner sets isDraw', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({
      board: { rows: 2, cols: 2, connectN: 3 }, // impossible to win connect-3 on 2×2
      totalRounds: 3,
    }));
    useGameStore.getState().startMatch();

    useGameStore.getState().makeMove(0); // P1 (1,0)
    useGameStore.getState().makeMove(1); // P2 (1,1)
    useGameStore.getState().makeMove(0); // P1 (0,0)
    useGameStore.getState().makeMove(1); // P2 (0,1) → full

    const s = useGameStore.getState();
    expect(s.isDraw).toBe(true);
    expect(s.winner).toBeNull();
  });

  it('33. Match end: win in final round sets phase to matchEnd', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 1 }));
    useGameStore.getState().startMatch();

    playHorizontalWin();
    expect(useGameStore.getState().phase).toBe('matchEnd');
  });

  it('34. First-to-N: reaching winsRequired ends match early', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({
      totalRounds: 10,
      matchWinCondition: 'first-to-n',
      winsRequired: 1,
    }));
    useGameStore.getState().startMatch();

    playHorizontalWin();
    expect(useGameStore.getState().phase).toBe('matchEnd');
    expect(useGameStore.getState().round).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Next round
// ---------------------------------------------------------------------------
describe('Next round', () => {
  beforeEach(() => {
    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 5 }));
    useGameStore.getState().startMatch();
  });

  it('35. nextRound increments round number', () => {
    playVerticalWin(0, 1);
    useGameStore.getState().nextRound();
    expect(useGameStore.getState().round).toBe(2);
  });

  it('36. nextRound creates fresh board', () => {
    playVerticalWin(0, 1);
    useGameStore.getState().nextRound();
    const { board } = useGameStore.getState();
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBe(0);
      }
    }
  });

  it('37. nextRound resets winner and isDraw', () => {
    playVerticalWin(0, 1);
    expect(useGameStore.getState().winner).not.toBeNull();
    useGameStore.getState().nextRound();
    expect(useGameStore.getState().winner).toBeNull();
    expect(useGameStore.getState().isDraw).toBe(false);
  });

  it('38. nextRound with rotate turn order changes start player', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({ turnOrder: 'rotate', totalRounds: 5 }));
    useGameStore.getState().startMatch();
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);

    playVerticalWin(0, 1);
    useGameStore.getState().nextRound();
    // startIndex = round(1) % 2 = 1
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
  });

  it('39. nextRound with fixed turn order keeps player 0', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({ turnOrder: 'fixed', totalRounds: 5 }));
    useGameStore.getState().startMatch();

    playVerticalWin(0, 1);
    useGameStore.getState().nextRound();
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);
  });

  it('40. nextRound with fairness turn order picks player with fewest wins', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({ turnOrder: 'fairness', totalRounds: 5 }));
    useGameStore.getState().startMatch();

    // P1 wins round 1 → P2 has 0 wins → P2 starts round 2
    playVerticalWin(0, 1);
    useGameStore.getState().nextRound();
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
  });

  it('41. nextRound in fullboard mode generates blocked cells from previous board', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({ mode: 'fullboard', totalRounds: 5 }));
    useGameStore.getState().startMatch();

    playVerticalWin(0, 1);
    const boardBeforeNext = useGameStore.getState().board;
    useGameStore.getState().nextRound();
    const { blockedCells, config } = useGameStore.getState();

    for (let r = 0; r < config.board.rows; r++) {
      for (let c = 0; c < config.board.cols; c++) {
        expect(blockedCells[r][c]).toBe(boardBeforeNext[r][c] !== 0);
      }
    }
  });

  it('42. nextRound with fullboard reset interval clears blocked cells', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(make2PlayerConfig({
      mode: 'fullboard',
      totalRounds: 5,
      fullBoardResetInterval: 1, // reset every round
    }));
    useGameStore.getState().startMatch();

    playVerticalWin(0, 1);
    useGameStore.getState().nextRound();

    const { blockedCells } = useGameStore.getState();
    for (const row of blockedCells) {
      for (const cell of row) {
        expect(cell).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
describe('Reset', () => {
  it('43. resetToMenu restores initial state', () => {
    useGameStore.getState().startMatch();
    useGameStore.getState().makeMove(0);
    useGameStore.getState().resetToMenu();

    const s = useGameStore.getState();
    expect(s.round).toBe(1);
    expect(s.moveHistory).toEqual([]);
    expect(s.roundResults).toEqual([]);
    expect(s.winner).toBeNull();
    expect(s.isDraw).toBe(false);
  });

  it('44. resetToMenu sets phase to menu', () => {
    useGameStore.getState().startMatch();
    useGameStore.getState().resetToMenu();
    expect(useGameStore.getState().phase).toBe('menu');
  });
});

// ---------------------------------------------------------------------------
// Bot integration
// ---------------------------------------------------------------------------
describe('Bot integration', () => {
  beforeEach(() => {
    useGameStore.getState().updateConfig(make2PlayerConfig({
      players: [
        { id: 1, name: 'Human', type: 'human', color: '#f00', pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
        { id: 2, name: 'Bot', type: 'bot', botDifficulty: 'easy', color: '#00f', pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
      ],
    }));
    useGameStore.getState().startMatch();
  });

  it('45. triggerBotMove makes move when current player is bot', () => {
    useGameStore.getState().makeMove(0); // human
    expect(useGameStore.getState().currentPlayerIndex).toBe(1); // bot's turn
    const movesBefore = useGameStore.getState().moveHistory.length;
    useGameStore.getState().triggerBotMove();
    expect(useGameStore.getState().moveHistory.length).toBeGreaterThan(movesBefore);
  });

  it('46. triggerBotMove does nothing when current player is human', () => {
    expect(useGameStore.getState().currentPlayerIndex).toBe(0); // human
    const movesBefore = useGameStore.getState().moveHistory.length;
    useGameStore.getState().triggerBotMove();
    expect(useGameStore.getState().moveHistory.length).toBe(movesBefore);
  });

  it('47. triggerBotMove does nothing when phase is not playing', () => {
    useGameStore.getState().setPhase('menu');
    const movesBefore = useGameStore.getState().moveHistory.length;
    useGameStore.getState().triggerBotMove();
    expect(useGameStore.getState().moveHistory.length).toBe(movesBefore);
  });
});

// ---------------------------------------------------------------------------
// Full game simulation
// ---------------------------------------------------------------------------
describe('Full game simulation', () => {
  it('48. Play a complete 3-round match', () => {
    useGameStore.getState().updateConfig(make2PlayerConfig({ totalRounds: 3, turnOrder: 'fixed' }));
    useGameStore.getState().startMatch();

    // Round 1
    playHorizontalWin();
    expect(useGameStore.getState().round).toBe(1);
    expect(useGameStore.getState().phase).toBe('roundEnd');
    expect(useGameStore.getState().roundResults).toHaveLength(1);

    // Round 2
    useGameStore.getState().nextRound();
    expect(useGameStore.getState().round).toBe(2);
    expect(useGameStore.getState().phase).toBe('playing');
    playHorizontalWin();
    expect(useGameStore.getState().phase).toBe('roundEnd');
    expect(useGameStore.getState().roundResults).toHaveLength(2);

    // Round 3 (final)
    useGameStore.getState().nextRound();
    expect(useGameStore.getState().round).toBe(3);
    playHorizontalWin();
    expect(useGameStore.getState().phase).toBe('matchEnd');
    expect(useGameStore.getState().roundResults).toHaveLength(3);

    const { scores, config } = useGameStore.getState();
    expect(scores[config.players[0].id]).toBeGreaterThanOrEqual(3);
  });

  it('49. Play fullboard mode game with blocked cells', () => {
    useGameStore.getState().updateConfig(make2PlayerConfig({
      mode: 'fullboard',
      totalRounds: 3,
      turnOrder: 'fixed',
    }));
    useGameStore.getState().startMatch();

    // Round 1: no blocked cells initially
    const blocked1 = useGameStore.getState().blockedCells;
    for (const row of blocked1) {
      for (const cell of row) {
        expect(cell).toBe(false);
      }
    }

    // Win round 1
    playHorizontalWin();
    const boardAfterR1 = useGameStore.getState().board;
    expect(useGameStore.getState().phase).toBe('roundEnd');

    // Round 2: blocked cells should reflect round 1's occupied cells
    useGameStore.getState().nextRound();
    const { blockedCells, config } = useGameStore.getState();
    let hasBlocked = false;
    for (let r = 0; r < config.board.rows; r++) {
      for (let c = 0; c < config.board.cols; c++) {
        if (boardAfterR1[r][c] !== 0) {
          expect(blockedCells[r][c]).toBe(true);
          hasBlocked = true;
        }
      }
    }
    expect(hasBlocked).toBe(true);

    // Can still make moves on non-blocked columns
    const validCol = useGameStore.getState().board[0].findIndex((_cell, ci) => !blockedCells[0][ci]);
    if (validCol >= 0) {
      useGameStore.getState().makeMove(validCol);
      expect(useGameStore.getState().moveHistory.length).toBeGreaterThan(0);
    }
  });
});
