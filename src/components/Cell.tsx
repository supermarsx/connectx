import React from 'react';
import type { Cell as CellType, PlayerId } from '../engine/types.ts';
import { EMPTY_CELL, PLAYER_COLORS } from '../engine/types.ts';

interface CellProps {
  value: CellType;
  row: number;
  col: number;
  blocked: boolean;
  isWinning: boolean;
  onClick: (col: number) => void;
}

function getPlayerColor(player: PlayerId): string {
  return PLAYER_COLORS[(player - 1) % PLAYER_COLORS.length] || '#ccc';
}

export const Cell: React.FC<CellProps> = React.memo(function Cell({
  value, col, blocked, isWinning, onClick,
}) {
  const isEmpty = value === EMPTY_CELL;

  const pieceStyle: React.CSSProperties = {
    width: '80%',
    height: '80%',
    borderRadius: '50%',
    backgroundColor: isEmpty
      ? (blocked ? '#E0D6E6' : '#FAF7FB')
      : getPlayerColor(value),
    transition: 'background-color 0.2s ease, transform 0.25s ease',
    transform: isWinning ? 'scale(1.1)' : 'scale(1)',
    boxShadow: isWinning
      ? `0 0 16px ${getPlayerColor(value)}`
      : isEmpty ? 'inset 0 2px 6px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.15)',
  };

  return (
    <div
      className="cell"
      role="button"
      tabIndex={0}
      aria-label={`Column ${col + 1}${isEmpty ? '' : `, Player ${value}`}${blocked ? ', blocked' : ''}`}
      onClick={() => onClick(col)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(col); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1',
        cursor: isEmpty && !blocked ? 'pointer' : 'default',
      }}
    >
      <div style={pieceStyle} />
    </div>
  );
});
