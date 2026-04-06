/**
 * Bot AI for ConnectX.
 * Implements Easy, Medium, and Hard difficulty levels.
 */

import type { Board, PlayerId, BoardConfig, BotDifficulty } from './types.ts';
import { DEFAULT_BOARD_CONFIG, EMPTY_CELL } from './types.ts';
import { getValidMoves, dropPiece } from './board.ts';
import { checkWinAtPosition } from './winDetection.ts';

/**
 * Get the bot's chosen column based on difficulty.
 */
export function getBotMove(
  board: Board,
  botPlayer: PlayerId,
  difficulty: BotDifficulty,
  config: BoardConfig = DEFAULT_BOARD_CONFIG,
  blocked?: boolean[][]
): number {
  const validMoves = getValidMoves(board, blocked);
  if (validMoves.length === 0) return -1;

  switch (difficulty) {
    case 'easy':
      return easyBot(board, botPlayer, validMoves, config, blocked);
    case 'medium':
      return mediumBot(board, botPlayer, validMoves, config, blocked);
    case 'hard':
      return hardBot(board, botPlayer, validMoves, config, blocked);
    default:
      return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
}

/**
 * Easy bot: Random with basic heuristics.
 * Will take a winning move or block an opponent's immediate win 50% of the time.
 */
function easyBot(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][]
): number {
  // 50% chance to play smart
  if (Math.random() < 0.5) {
    const smartMove = findImmediateWinOrBlock(board, botPlayer, validMoves, config, blocked);
    if (smartMove !== -1) return smartMove;
  }

  // Otherwise random
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

/**
 * Medium bot: Rule-based with 1-step lookahead.
 * Always takes winning moves and blocks opponent wins.
 * Prefers center columns.
 */
function mediumBot(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][]
): number {
  // 1. Check for immediate win
  const winMove = findWinningMove(board, botPlayer, validMoves, config, blocked);
  if (winMove !== -1) return winMove;

  // 2. Block opponent's immediate win
  const blockMove = findBlockingMove(board, botPlayer, validMoves, config, blocked);
  if (blockMove !== -1) return blockMove;

  // 3. Prefer center columns
  const center = Math.floor(config.cols / 2);
  const sortedByCenter = [...validMoves].sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center)
  );

  // 4. Avoid moves that give opponent a win next turn
  for (const col of sortedByCenter) {
    if (!moveSetsUpOpponentWin(board, col, botPlayer, config, blocked)) {
      return col;
    }
  }

  // If all moves set up opponent, just pick the center-most one
  return sortedByCenter[0];
}

/**
 * Hard bot: Minimax with alpha-beta pruning.
 */
function hardBot(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][]
): number {
  // Scale depth based on board size: smaller boards get deeper search
  const totalCells = config.rows * config.cols;
  const depth = totalCells <= 42 ? 6 : totalCells <= 72 ? 4 : 3;
  let bestScore = -Infinity;
  let bestCol = validMoves[0];

  // Sort moves by center preference for better pruning
  const center = Math.floor(config.cols / 2);
  const sortedMoves = [...validMoves].sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center)
  );

  for (const col of sortedMoves) {
    const result = dropPiece(board, col, botPlayer, blocked);
    if (!result) continue;

    const win = checkWinAtPosition(result.board, result.row, col, config.connectN);
    if (win === botPlayer) return col;

    const score = minimax(
      result.board, depth - 1, -Infinity, Infinity, false,
      botPlayer, config, blocked
    );

    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  botPlayer: PlayerId,
  config: BoardConfig,
  blocked?: boolean[][]
): number {
  const validMoves = getValidMoves(board, blocked);

  if (depth === 0 || validMoves.length === 0) {
    return evaluateBoard(board, botPlayer, config);
  }

  // Determine current player (assumes 2-player for minimax)
  const currentPlayer = isMaximizing ? botPlayer : getOpponent(botPlayer);

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const col of validMoves) {
      const result = dropPiece(board, col, currentPlayer, blocked);
      if (!result) continue;

      const win = checkWinAtPosition(result.board, result.row, col, config.connectN);
      if (win === botPlayer) return 10000 + depth;

      const score = minimax(result.board, depth - 1, alpha, beta, false, botPlayer, config, blocked);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const col of validMoves) {
      const result = dropPiece(board, col, currentPlayer, blocked);
      if (!result) continue;

      const win = checkWinAtPosition(result.board, result.row, col, config.connectN);
      if (win !== null && win !== botPlayer) return -10000 - depth;

      const score = minimax(result.board, depth - 1, alpha, beta, true, botPlayer, config, blocked);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

/** Simple board evaluation heuristic */
function evaluateBoard(board: Board, botPlayer: PlayerId, config: BoardConfig): number {
  let score = 0;
  const rows = board.length;
  const cols = board[0].length;
  const opponent = getOpponent(botPlayer);

  // Center column preference
  const centerCol = Math.floor(cols / 2);
  for (let row = 0; row < rows; row++) {
    if (board[row][centerCol] === botPlayer) score += 3;
    if (board[row][centerCol] === opponent) score -= 3;
  }

  // Evaluate windows of connectN size
  const directions = [
    { dr: 0, dc: 1 },  // horizontal
    { dr: 1, dc: 0 },  // vertical
    { dr: 1, dc: 1 },  // diagonal ↘
    { dr: 1, dc: -1 }, // diagonal ↙
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (const { dr, dc } of directions) {
        const window: number[] = [];
        for (let i = 0; i < config.connectN; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= rows || c < 0 || c >= cols) break;
          window.push(board[r][c]);
        }
        if (window.length === config.connectN) {
          score += evaluateWindow(window, botPlayer, opponent);
        }
      }
    }
  }

  return score;
}

function evaluateWindow(window: number[], botPlayer: PlayerId, opponent: PlayerId): number {
  const botCount = window.filter(c => c === botPlayer).length;
  const oppCount = window.filter(c => c === opponent).length;
  const emptyCount = window.filter(c => c === EMPTY_CELL).length;

  if (botCount === 3 && emptyCount === 1) return 5;
  if (botCount === 2 && emptyCount === 2) return 2;
  if (oppCount === 3 && emptyCount === 1) return -4;
  if (oppCount === 2 && emptyCount === 2) return -1;

  return 0;
}

function getOpponent(player: PlayerId): PlayerId {
  return player === 1 ? 2 : 1;
}

/** Find a move that wins immediately */
function findWinningMove(
  board: Board,
  player: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][]
): number {
  for (const col of validMoves) {
    const result = dropPiece(board, col, player, blocked);
    if (!result) continue;
    if (checkWinAtPosition(result.board, result.row, col, config.connectN) === player) {
      return col;
    }
  }
  return -1;
}

/** Find a move that blocks opponent's immediate win */
function findBlockingMove(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][]
): number {
  // Check for each opponent
  const opponent = getOpponent(botPlayer);
  for (const col of validMoves) {
    const result = dropPiece(board, col, opponent, blocked);
    if (!result) continue;
    if (checkWinAtPosition(result.board, result.row, col, config.connectN) === opponent) {
      return col;
    }
  }
  return -1;
}

/** Check if either immediate win or block is available */
function findImmediateWinOrBlock(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][]
): number {
  const win = findWinningMove(board, botPlayer, validMoves, config, blocked);
  if (win !== -1) return win;
  return findBlockingMove(board, botPlayer, validMoves, config, blocked);
}

/** Check if a move sets up the opponent to win on their next turn */
function moveSetsUpOpponentWin(
  board: Board,
  col: number,
  botPlayer: PlayerId,
  config: BoardConfig,
  blocked?: boolean[][]
): boolean {
  const result = dropPiece(board, col, botPlayer, blocked);
  if (!result) return false;

  const opponent = getOpponent(botPlayer);
  const opponentMoves = getValidMoves(result.board, blocked);

  for (const oppCol of opponentMoves) {
    const oppResult = dropPiece(result.board, oppCol, opponent, blocked);
    if (!oppResult) continue;
    if (checkWinAtPosition(oppResult.board, oppResult.row, oppCol, config.connectN) === opponent) {
      return true;
    }
  }

  return false;
}
