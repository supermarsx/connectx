/**
 * Server engine — re-exports from @connectx/shared to maintain backward compatibility.
 */
export {
  createBoard,
  cloneBoard,
  dropPiece,
  isValidMove,
  getValidMoves,
  isBoardFull,
  createBlockedGrid,
  generateBlockedCells,
  checkWinAtPosition,
  findWinner,
  getWinningCells,
  getBotMove,
  EMPTY_CELL,
  DEFAULT_BOARD_CONFIG,
  PLAYER_COLORS,
} from '@connectx/shared/engine';

export type {
  Board,
  Cell,
  PlayerId,
  GameMode,
  BotDifficulty,
  BoardConfig,
} from '@connectx/shared/engine';
