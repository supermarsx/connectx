/**
 * Bot AI for ConnectX.
 * Implements Easy, Medium, and Hard difficulty levels.
 */

import type { Board, PlayerId, BoardConfig, BotDifficulty } from './types.js';
import { DEFAULT_BOARD_CONFIG, EMPTY_CELL } from './types.js';
import { getValidMoves, dropPiece } from './board.js';
import { checkWinAtPosition } from './winDetection.js';

/**
 * Get the bot's chosen column based on difficulty.
 */
export function getBotMove(
  board: Board,
  botPlayer: PlayerId,
  difficulty: BotDifficulty,
  config: BoardConfig = DEFAULT_BOARD_CONFIG,
  blocked?: boolean[][],
  playerCount: number = 2,
): number {
  const validMoves = getValidMoves(board, blocked);
  if (validMoves.length === 0) return -1;

  switch (difficulty) {
    case 'easy':
      return easyBot(board, botPlayer, validMoves, config, blocked, playerCount);
    case 'medium':
      return mediumBot(board, botPlayer, validMoves, config, blocked, playerCount);
    case 'hard':
      return hardBot(board, botPlayer, validMoves, config, blocked, playerCount);
    default:
      return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
}

function getOpponents(player: PlayerId, playerCount: number): PlayerId[] {
  const opponents: PlayerId[] = [];
  for (let i = 1; i <= playerCount; i++) {
    if (i !== player) opponents.push(i as PlayerId);
  }
  return opponents;
}

function getNextPlayer(current: PlayerId, playerCount: number): PlayerId {
  return ((current % playerCount) + 1) as PlayerId;
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
  blocked?: boolean[][],
  playerCount: number = 2,
): number {
  if (Math.random() < 0.5) {
    const smartMove = findImmediateWinOrBlock(
      board,
      botPlayer,
      validMoves,
      config,
      blocked,
      playerCount,
    );
    if (smartMove !== -1) return smartMove;
  }

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
  blocked?: boolean[][],
  playerCount: number = 2,
): number {
  const winMove = findWinningMove(board, botPlayer, validMoves, config, blocked);
  if (winMove !== -1) return winMove;

  const blockMove = findBlockingMove(
    board,
    botPlayer,
    validMoves,
    config,
    blocked,
    playerCount,
  );
  if (blockMove !== -1) return blockMove;

  const center = Math.floor(config.cols / 2);
  const sortedByCenter = [...validMoves].sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center),
  );

  for (const col of sortedByCenter) {
    if (!moveSetsUpOpponentWin(board, col, botPlayer, config, blocked, playerCount)) {
      return col;
    }
  }

  return sortedByCenter[0];
}

/**
 * Hard bot: Minimax with alpha-beta pruning and time limit.
 */
const MINIMAX_TIME_LIMIT_MS = 3000;

function hardBot(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][],
  playerCount: number = 2,
): number {
  // Scale depth based on board size: smaller boards get deeper search
  const totalCells = config.rows * config.cols;
  let depth = totalCells <= 42 ? 6 : totalCells <= 72 ? 4 : 3;
  // Reduce depth for multi-player games (more branching)
  depth = playerCount > 2 ? Math.max(depth - 2, 2) : depth;
  let bestScore = -Infinity;
  let bestCol = validMoves[0];

  const center = Math.floor(config.cols / 2);
  const sortedMoves = [...validMoves].sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center),
  );

  const nextPlayer = getNextPlayer(botPlayer, playerCount);
  const startTime = Date.now();

  for (const col of sortedMoves) {
    const result = dropPiece(board, col, botPlayer, blocked);
    if (!result) continue;

    const win = checkWinAtPosition(
      result.board,
      result.row,
      col,
      config.connectN,
    );
    if (win === botPlayer) return col;

    const score = minimax(
      result.board,
      depth - 1,
      -Infinity,
      Infinity,
      nextPlayer,
      botPlayer,
      config,
      blocked,
      playerCount,
      startTime,
    );

    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }

    // If time expired, return best found so far
    if (Date.now() - startTime >= MINIMAX_TIME_LIMIT_MS) break;
  }

  return bestCol;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  currentPlayerId: PlayerId,
  botPlayer: PlayerId,
  config: BoardConfig,
  blocked?: boolean[][],
  playerCount: number = 2,
  startTime?: number,
): number {
  const validMoves = getValidMoves(board, blocked);

  if (depth === 0 || validMoves.length === 0) {
    return evaluateBoard(board, botPlayer, config, playerCount);
  }

  // Time limit check
  if (startTime !== undefined && Date.now() - startTime >= MINIMAX_TIME_LIMIT_MS) {
    return evaluateBoard(board, botPlayer, config, playerCount);
  }

  const isMaximizing = currentPlayerId === botPlayer;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const col of validMoves) {
      const result = dropPiece(board, col, currentPlayerId, blocked);
      if (!result) continue;

      const win = checkWinAtPosition(
        result.board,
        result.row,
        col,
        config.connectN,
      );
      if (win === botPlayer) return 10000 + depth;

      const nextPlayer = getNextPlayer(currentPlayerId, playerCount);
      const score = minimax(
        result.board,
        depth - 1,
        alpha,
        beta,
        nextPlayer,
        botPlayer,
        config,
        blocked,
        playerCount,
        startTime,
      );
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const col of validMoves) {
      const result = dropPiece(board, col, currentPlayerId, blocked);
      if (!result) continue;

      const win = checkWinAtPosition(
        result.board,
        result.row,
        col,
        config.connectN,
      );
      if (win !== null && win !== botPlayer) return -10000 - depth;

      const nextPlayer = getNextPlayer(currentPlayerId, playerCount);
      const score = minimax(
        result.board,
        depth - 1,
        alpha,
        beta,
        nextPlayer,
        botPlayer,
        config,
        blocked,
        playerCount,
        startTime,
      );
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

function evaluateBoard(
  board: Board,
  botPlayer: PlayerId,
  config: BoardConfig,
  playerCount: number = 2,
): number {
  let score = 0;
  const rows = board.length;
  const cols = board[0].length;
  const opponents = getOpponents(botPlayer, playerCount);

  const centerCol = Math.floor(cols / 2);
  for (let row = 0; row < rows; row++) {
    if (board[row][centerCol] === botPlayer) score += 3;
    for (const opp of opponents) {
      if (board[row][centerCol] === opp) score -= 3;
    }
  }

  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
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
          score += evaluateWindow(window, botPlayer, opponents);
        }
      }
    }
  }

  return score;
}

function evaluateWindow(
  window: number[],
  botPlayer: PlayerId,
  opponents: PlayerId[],
): number {
  const botCount = window.filter((c) => c === botPlayer).length;
  const oppCount = window.filter((c) => opponents.includes(c as PlayerId)).length;
  const emptyCount = window.filter((c) => c === EMPTY_CELL).length;

  if (botCount === 3 && emptyCount === 1) return 5;
  if (botCount === 2 && emptyCount === 2) return 2;
  if (oppCount === 3 && emptyCount === 1) return -4;
  if (oppCount === 2 && emptyCount === 2) return -1;

  return 0;
}

function findWinningMove(
  board: Board,
  player: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][],
): number {
  for (const col of validMoves) {
    const result = dropPiece(board, col, player, blocked);
    if (!result) continue;
    if (
      checkWinAtPosition(result.board, result.row, col, config.connectN) ===
      player
    ) {
      return col;
    }
  }
  return -1;
}

function findBlockingMove(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][],
  playerCount: number = 2,
): number {
  const opponents = getOpponents(botPlayer, playerCount);
  for (const col of validMoves) {
    for (const opponent of opponents) {
      const result = dropPiece(board, col, opponent, blocked);
      if (!result) continue;
      if (
        checkWinAtPosition(result.board, result.row, col, config.connectN) ===
        opponent
      ) {
        return col;
      }
    }
  }
  return -1;
}

function findImmediateWinOrBlock(
  board: Board,
  botPlayer: PlayerId,
  validMoves: number[],
  config: BoardConfig,
  blocked?: boolean[][],
  playerCount: number = 2,
): number {
  const win = findWinningMove(board, botPlayer, validMoves, config, blocked);
  if (win !== -1) return win;
  return findBlockingMove(board, botPlayer, validMoves, config, blocked, playerCount);
}

function moveSetsUpOpponentWin(
  board: Board,
  col: number,
  botPlayer: PlayerId,
  config: BoardConfig,
  blocked?: boolean[][],
  playerCount: number = 2,
): boolean {
  const result = dropPiece(board, col, botPlayer, blocked);
  if (!result) return false;

  const opponents = getOpponents(botPlayer, playerCount);
  const opponentMoves = getValidMoves(result.board, blocked);

  for (const oppCol of opponentMoves) {
    for (const opponent of opponents) {
      const oppResult = dropPiece(result.board, oppCol, opponent, blocked);
      if (!oppResult) continue;
      if (
        checkWinAtPosition(
          oppResult.board,
          oppResult.row,
          oppCol,
          config.connectN,
        ) === opponent
      ) {
        return true;
      }
    }
  }

  return false;
}
