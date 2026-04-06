import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../store/gameStore.ts';
import type { GameConfig, PlayerConfig } from '../engine/types.ts';
import { PLAYER_COLORS, PLAYER_OUTLINE_COLORS, PIECE_PATTERNS, DEFAULT_AVATARS } from '../engine/types.ts';

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

function makeNPlayerConfig(count: number, overrides: Partial<GameConfig> = {}): Partial<GameConfig> {
  const players: PlayerConfig[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    type: 'human' as const,
    color: PLAYER_COLORS[i] ?? `#${(i * 111111).toString(16).slice(0, 6)}`,
    outlineColor: PLAYER_OUTLINE_COLORS[i] ?? '#333333',
    pattern: PIECE_PATTERNS[i % PIECE_PATTERNS.length],
    avatar: DEFAULT_AVATARS[i % DEFAULT_AVATARS.length],
  }));

  return {
    board: { rows: 6, cols: 7, connectN: 4 },
    mode: 'classic',
    matchType: 'local',
    players,
    totalRounds: 3,
    matchWinCondition: 'fixed-rounds',
    winsRequired: 3,
    fullBoardResetInterval: 0,
    turnOrder: 'rotate',
    randomizeTurnOrder: false,
    ...overrides,
  };
}

describe('3-Player scenarios', () => {
  beforeEach(() => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(makeNPlayerConfig(3));
    useGameStore.getState().startMatch();
  });

  it('initializes with 3 players and 3 scores', () => {
    const state = useGameStore.getState();
    expect(state.config.players.length).toBe(3);
    expect(Object.keys(state.scores).length).toBe(3);
    expect(state.scores[1]).toBe(0);
    expect(state.scores[2]).toBe(0);
    expect(state.scores[3]).toBe(0);
  });

  it('cycles through 3 players correctly', () => {
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);
    useGameStore.getState().makeMove(0); // P1
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    useGameStore.getState().makeMove(1); // P2
    expect(useGameStore.getState().currentPlayerIndex).toBe(2);
    useGameStore.getState().makeMove(2); // P3
    expect(useGameStore.getState().currentPlayerIndex).toBe(0); // back to P1
  });

  it('player 1 can win with connect-4 in 3-player game', () => {
    // P1 plays col 0 every time, P2 plays col 1, P3 plays col 2
    // P1 needs 4 turns: moves at turns 0, 3, 6, 9
    useGameStore.getState().makeMove(0); // P1 - row 5, col 0
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(0); // P1 - row 4, col 0
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(0); // P1 - row 3, col 0
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(0); // P1 - row 2, col 0 → connect-4!

    const state = useGameStore.getState();
    expect(state.winner).toBe(1);
    expect(state.phase).toBe('roundEnd');
  });

  it('player 3 can win in a 3-player game', () => {
    // P1 alternates cols 0/2, P2 alternates cols 1/3, P3 stacks col 5
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(5); // P3 - row 5
    useGameStore.getState().makeMove(2); // P1
    useGameStore.getState().makeMove(3); // P2
    useGameStore.getState().makeMove(5); // P3 - row 4
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(5); // P3 - row 3
    useGameStore.getState().makeMove(2); // P1
    useGameStore.getState().makeMove(3); // P2
    useGameStore.getState().makeMove(5); // P3 - row 2 → connect-4!

    expect(useGameStore.getState().winner).toBe(3);
  });

  it('rotate turn order works with 3 players across rounds', () => {
    // Win round 1 quickly
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(0); // P1 wins

    useGameStore.getState().nextRound();
    // Round 2: startIndex = 1 % 3 = 1
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
  });
});

describe('4-Player scenarios', () => {
  beforeEach(() => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(makeNPlayerConfig(4));
    useGameStore.getState().startMatch();
  });

  it('initializes with 4 players and 4 scores', () => {
    const state = useGameStore.getState();
    expect(state.config.players.length).toBe(4);
    expect(Object.keys(state.scores).length).toBe(4);
  });

  it('cycles through 4 players correctly', () => {
    expect(useGameStore.getState().currentPlayerIndex).toBe(0);
    useGameStore.getState().makeMove(0); // P1
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    useGameStore.getState().makeMove(1); // P2
    expect(useGameStore.getState().currentPlayerIndex).toBe(2);
    useGameStore.getState().makeMove(2); // P3
    expect(useGameStore.getState().currentPlayerIndex).toBe(3);
    useGameStore.getState().makeMove(3); // P4
    expect(useGameStore.getState().currentPlayerIndex).toBe(0); // back to P1
  });

  it('player 4 can win in a 4-player game', () => {
    // P1-P3 alternate columns, P4 stacks col 6
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(6); // P4 - row 5
    useGameStore.getState().makeMove(3); // P1
    useGameStore.getState().makeMove(4); // P2
    useGameStore.getState().makeMove(5); // P3
    useGameStore.getState().makeMove(6); // P4 - row 4
    useGameStore.getState().makeMove(0); // P1
    useGameStore.getState().makeMove(1); // P2
    useGameStore.getState().makeMove(2); // P3
    useGameStore.getState().makeMove(6); // P4 - row 3
    useGameStore.getState().makeMove(3); // P1
    useGameStore.getState().makeMove(4); // P2
    useGameStore.getState().makeMove(5); // P3
    useGameStore.getState().makeMove(6); // P4 - row 2 → connect-4!

    expect(useGameStore.getState().winner).toBe(4);
  });

  it('scores tracked independently for 4 players', () => {
    // P1 wins round 1
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().makeMove(0); // P1
      useGameStore.getState().makeMove(1); // P2
      useGameStore.getState().makeMove(2); // P3
      useGameStore.getState().makeMove(3); // P4
    }
    useGameStore.getState().makeMove(0); // P1 wins

    const scores = useGameStore.getState().scores;
    expect(scores[1]).toBeGreaterThanOrEqual(1);
    expect(scores[2]).toBe(0);
    expect(scores[3]).toBe(0);
    expect(scores[4]).toBe(0);
  });

  it('fairness mode picks least-winning player in 4-player game', () => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(makeNPlayerConfig(4, { turnOrder: 'fairness', totalRounds: 5 }));
    useGameStore.getState().startMatch();

    // P1 wins
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().makeMove(0);
      useGameStore.getState().makeMove(1);
      useGameStore.getState().makeMove(2);
      useGameStore.getState().makeMove(3);
    }
    useGameStore.getState().makeMove(0); // P1 connect-4

    useGameStore.getState().nextRound();
    // In fairness mode, the player with fewest wins should go first
    // P2, P3, P4 all have 0 wins; by tie-breaking (lowest index), P2 (index 1) starts
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
  });
});

describe('3-Player fullboard mode', () => {
  beforeEach(() => {
    useGameStore.getState().resetToMenu();
    useGameStore.getState().updateConfig(makeNPlayerConfig(3, {
      mode: 'fullboard',
      totalRounds: 2,
    }));
    useGameStore.getState().startMatch();
  });

  it('fullboard works with 3 players', () => {
    const state = useGameStore.getState();
    expect(state.config.mode).toBe('fullboard');
    expect(state.config.players.length).toBe(3);
    expect(state.blockedCells.every(row => row.every(cell => !cell))).toBe(true);
  });

  it('3 players can play and win in fullboard mode', () => {
    // P1: col 0, P2: col 1, P3: col 2
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().makeMove(0); // P1
      useGameStore.getState().makeMove(1); // P2
      useGameStore.getState().makeMove(2); // P3
    }
    useGameStore.getState().makeMove(0); // P1 4th in col 0 → win

    expect(useGameStore.getState().winner).toBe(1);
  });
});
