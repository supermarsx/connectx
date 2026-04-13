/**
 * Board operations — re-exported from @connectx/shared for backward compatibility.
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
} from '@connectx/shared/engine';