/**
 * Zustand game store — central state management for ConnectX.
 */

import { create } from 'zustand';
import type {
  GameState, GameConfig, GamePhase, PlayerId, RoundResult,
} from '../engine/types.ts';
import {
  DEFAULT_BOARD_CONFIG, PLAYER_COLORS,
} from '../engine/types.ts';
import {
  createBoard, createBlockedGrid, dropPiece, isBoardFull,
  generateBlockedCells, getValidMoves,
} from '../engine/board.ts';
import { checkWinAtPosition } from '../engine/winDetection.ts';
import { getBotMove } from '../engine/bot.ts';

function createDefaultConfig(): GameConfig {
  return {
    board: { ...DEFAULT_BOARD_CONFIG },
    mode: 'classic',
    matchType: 'local',
    players: [
      { id: 1, name: 'Player 1', type: 'human', color: PLAYER_COLORS[0] },
      { id: 2, name: 'Player 2', type: 'human', color: PLAYER_COLORS[1] },
    ],
    totalRounds: 3,
  };
}

function createInitialState(): GameState {
  const config = createDefaultConfig();
  const scores: Record<PlayerId, number> = {};
  config.players.forEach(p => { scores[p.id] = 0; });

  return {
    phase: 'menu',
    config,
    board: createBoard(config.board),
    currentPlayerIndex: 0,
    round: 1,
    scores,
    roundResults: [],
    winner: null,
    isDraw: false,
    blockedCells: createBlockedGrid(config.board),
    moveHistory: [],
  };
}

interface GameActions {
  /** Set the game phase */
  setPhase: (phase: GamePhase) => void;

  /** Update game configuration */
  updateConfig: (config: Partial<GameConfig>) => void;

  /** Start a new match with current config */
  startMatch: () => void;

  /** Make a move (drop piece in column) */
  makeMove: (col: number) => void;

  /** Advance to the next round */
  nextRound: () => void;

  /** Reset back to menu */
  resetToMenu: () => void;

  /** Trigger bot move if it's a bot's turn */
  triggerBotMove: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setPhase: (phase) => set({ phase }),

  updateConfig: (partial) =>
    set((state) => ({
      config: { ...state.config, ...partial },
    })),

  startMatch: () => {
    const { config } = get();
    const scores: Record<PlayerId, number> = {};
    config.players.forEach(p => { scores[p.id] = 0; });

    set({
      phase: 'playing',
      board: createBoard(config.board),
      currentPlayerIndex: 0,
      round: 1,
      scores,
      roundResults: [],
      winner: null,
      isDraw: false,
      blockedCells: createBlockedGrid(config.board),
      moveHistory: [],
    });
  },

  makeMove: (col) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const currentPlayer = state.config.players[state.currentPlayerIndex];
    const blocked = state.config.mode === 'fullboard' ? state.blockedCells : undefined;

    const result = dropPiece(state.board, col, currentPlayer.id, blocked);
    if (!result) return;

    const winner = checkWinAtPosition(
      result.board, result.row, col, state.config.board.connectN
    );

    const draw = !winner && isBoardFull(result.board, blocked);

    const moveEntry = { row: result.row, col, player: currentPlayer.id };

    if (winner || draw) {
      const roundResult: RoundResult = {
        roundNumber: state.round,
        winner: winner ?? null,
        draw,
        board: result.board,
      };

      const newScores = { ...state.scores };
      if (winner) {
        newScores[winner] = (newScores[winner] || 0) + 1;
      }

      const isMatchOver = state.round >= state.config.totalRounds;

      set({
        board: result.board,
        winner: winner ?? null,
        isDraw: draw,
        scores: newScores,
        roundResults: [...state.roundResults, roundResult],
        phase: isMatchOver ? 'matchEnd' : 'roundEnd',
        moveHistory: [...state.moveHistory, moveEntry],
      });
    } else {
      // Continue playing — advance to next player
      const nextPlayerIndex =
        (state.currentPlayerIndex + 1) % state.config.players.length;

      set({
        board: result.board,
        currentPlayerIndex: nextPlayerIndex,
        moveHistory: [...state.moveHistory, moveEntry],
      });
    }
  },

  nextRound: () => {
    const state = get();
    const blocked = state.config.mode === 'fullboard'
      ? generateBlockedCells(state.board)
      : createBlockedGrid(state.config.board);

    set({
      phase: 'playing',
      board: createBoard(state.config.board),
      currentPlayerIndex: 0,
      round: state.round + 1,
      winner: null,
      isDraw: false,
      blockedCells: blocked,
      moveHistory: [],
    });
  },

  resetToMenu: () => set(createInitialState()),

  triggerBotMove: () => {
    const state = get();
    if (state.phase !== 'playing') return;

    const currentPlayer = state.config.players[state.currentPlayerIndex];
    if (currentPlayer.type !== 'bot') return;

    const blocked = state.config.mode === 'fullboard' ? state.blockedCells : undefined;
    const validMoves = getValidMoves(state.board, blocked);
    if (validMoves.length === 0) return;

    const col = getBotMove(
      state.board,
      currentPlayer.id,
      currentPlayer.botDifficulty ?? 'easy',
      state.config.board,
      blocked
    );

    if (col >= 0) {
      get().makeMove(col);
    }
  },
}));
