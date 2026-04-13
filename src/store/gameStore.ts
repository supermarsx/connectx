/**
 * Zustand game store — central state management for ConnectX.
 */

import { create } from 'zustand';
import type {
  GameState, GameConfig, GamePhase, PlayerId, RoundResult,
} from '../engine/types.ts';
import { PLAYER_COLORS, PLAYER_OUTLINE_COLORS, PIECE_PATTERNS, DEFAULT_AVATARS, BOARD_SIZE_PRESETS } from '../engine/types.ts';
import { createBoard, createBlockedGrid, dropPiece, isBoardFull, generateBlockedCells, getValidMoves } from '../engine/board.ts';
import { checkWinAtPosition, calculateRoundBonus } from '../engine/winDetection.ts';
import { getBotMove } from '../engine/bot.ts';
import { useProfileStore } from './profileStore.ts';

/** Fisher-Yates shuffle (returns a new array) */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}



function createDefaultConfig(): GameConfig {
  const profile = useProfileStore.getState();
  const p1Name = profile.username || 'Player 1';
  const p1Color = profile.favoriteColor || PLAYER_COLORS[0];
  // If p1's color matches p2's default, swap p2 to p1's original default
  const p2Color = p1Color === PLAYER_COLORS[1] ? PLAYER_COLORS[0] : PLAYER_COLORS[1];
  const defaultBoard = BOARD_SIZE_PRESETS[0];
  return {
    board: { rows: defaultBoard.rows, cols: defaultBoard.cols, connectN: defaultBoard.connectN },
    mode: 'classic',
    matchType: 'local',
    players: [
      { id: 1, name: p1Name, type: 'human', color: p1Color, outlineColor: PLAYER_OUTLINE_COLORS[0], pattern: PIECE_PATTERNS[0], avatar: DEFAULT_AVATARS[0] },
      { id: 2, name: 'Player 2', type: 'human', color: p2Color, outlineColor: PLAYER_OUTLINE_COLORS[1], pattern: PIECE_PATTERNS[1], avatar: DEFAULT_AVATARS[1] },
    ],
    totalRounds: 3,
    matchWinCondition: 'fixed-rounds',
    winsRequired: 3,
    fullBoardResetInterval: 0,
    turnOrder: 'rotate',
    randomizeTurnOrder: false,
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

  /** Reset to lobby (keep config, reset match state) */
  resetToLobby: () => void;

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
    // Safety net: ensure every player has a pattern assigned
    const patchedPlayers = config.players.map((p, i) => ({
      ...p,
      pattern: p.pattern ?? PIECE_PATTERNS[i % PIECE_PATTERNS.length],
    }));
    const patchedConfig = { ...config, players: patchedPlayers };
    const matchConfig = patchedConfig.randomizeTurnOrder
      ? { ...patchedConfig, players: shuffleArray(patchedConfig.players) }
      : patchedConfig;
    const scores: Record<PlayerId, number> = {};
    matchConfig.players.forEach(p => { scores[p.id] = 0; });

    // If 'up-to-brim' mode, set totalRounds to max possible moves
    let totalRounds = matchConfig.totalRounds;
    if (matchConfig.matchWinCondition === 'up-to-brim' && matchConfig.mode === 'fullboard') {
      totalRounds = matchConfig.board.rows * matchConfig.board.cols;
    }

    set({
      phase: 'playing',
      config: { ...matchConfig, totalRounds },
      board: createBoard(matchConfig.board),
      currentPlayerIndex: 0,
      round: 1,
      scores,
      roundResults: [],
      winner: null,
      isDraw: false,
      blockedCells: createBlockedGrid(matchConfig.board),
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
        const bonus = calculateRoundBonus(
          result.board, result.row, col,
          state.config.board.connectN,
          state.roundResults, winner
        );
        newScores[winner] += bonus;
      }

      let isMatchOver = state.round >= state.config.totalRounds;
      if (state.config.matchWinCondition === 'first-to-n' && winner) {
        const roundResults = [...state.roundResults, roundResult];
        const actualWins = roundResults.filter(r => r.winner === winner).length;
        if (actualWins >= state.config.winsRequired) {
          isMatchOver = true;
        }
      }

      set({
        board: result.board,
        winner: winner ?? null,
        isDraw: draw,
        scores: newScores,
        roundResults: [...state.roundResults, roundResult],
        phase: isMatchOver ? 'matchEnd' : 'roundEnd',
        moveHistory: [...state.moveHistory, moveEntry],
      });

      if (isMatchOver) {
        const p1 = state.config.players[0];
        if (p1.type === 'human') {
          const p1Score = newScores[p1.id] || 0;
          const maxOpponentScore = Math.max(
            ...state.config.players.filter(p => p.id !== p1.id).map(p => newScores[p.id] || 0)
          );
          const p1Won = p1Score > maxOpponentScore;
          useProfileStore.getState().recordGameResult(p1Won);
        }
      }
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
    const nextRoundNumber = state.round + 1;

    let blocked: boolean[][];
    if (state.config.mode === 'fullboard') {
      const interval = state.config.fullBoardResetInterval;
      const shouldReset = interval > 0 && (state.round % interval === 0);
      blocked = shouldReset
        ? createBlockedGrid(state.config.board)
        : generateBlockedCells(state.board);
    } else {
      blocked = createBlockedGrid(state.config.board);
    }

    const playerCount = state.config.players.length;
    let startIndex = 0;

    if (state.config.turnOrder === 'rotate') {
      startIndex = state.round % playerCount;
    } else if (state.config.turnOrder === 'fairness') {
      let fewestWins = Infinity;
      for (let i = 0; i < playerCount; i++) {
        const playerId = state.config.players[i].id;
        const actualWins = state.roundResults.filter(r => r.winner === playerId).length;
        if (actualWins < fewestWins) {
          fewestWins = actualWins;
          startIndex = i;
        }
      }
    }

    set({
      phase: 'playing',
      board: createBoard(state.config.board),
      currentPlayerIndex: startIndex,
      round: nextRoundNumber,
      winner: null,
      isDraw: false,
      blockedCells: blocked,
      moveHistory: [],
    });
  },

  resetToMenu: () => set(createInitialState()),

  resetToLobby: () => {
    const { config } = get();
    const scores: Record<number, number> = {};
    config.players.forEach(p => { scores[p.id] = 0; });
    set({
      phase: 'lobby',
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
