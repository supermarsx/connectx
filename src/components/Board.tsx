import React, { useMemo } from 'react';
import type { Board as BoardType, PlayerId, BoardConfig } from '../engine/types.ts';
import { getWinningCells } from '../engine/winDetection.ts';
import { Cell } from './Cell.tsx';

interface BoardProps {
  board: BoardType;
  config: BoardConfig;
  blocked: boolean[][];
  winner: PlayerId | null;
  lastMove: { row: number; col: number } | null;
  onColumnClick: (col: number) => void;
}

export const Board: React.FC<BoardProps> = React.memo(function Board({
  board, config, blocked, winner, lastMove, onColumnClick,
}) {
  const winningSet = useMemo(() => {
    if (!winner || !lastMove) return new Set<string>();
    const cells = getWinningCells(board, lastMove.row, lastMove.col, config.connectN);
    if (!cells) return new Set<string>();
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, [board, winner, lastMove, config.connectN]);

  return (
    <div
      className="board"
      role="grid"
      aria-label="Game board"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        gap: '6px',
        padding: '16px',
        backgroundColor: '#17171F',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(23,23,31,0.3)',
      }}
    >
      {board.map((row, rowIdx) =>
        row.map((cell, colIdx) => (
          <Cell
            key={`${rowIdx}-${colIdx}`}
            value={cell}
            row={rowIdx}
            col={colIdx}
            blocked={blocked[rowIdx]?.[colIdx] ?? false}
            isWinning={winningSet.has(`${rowIdx},${colIdx}`)}
            onClick={onColumnClick}
          />
        ))
      )}
    </div>
  );
});
