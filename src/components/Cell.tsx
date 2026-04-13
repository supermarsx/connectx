import React from 'react';
import type { Cell as CellType, PlayerId, PiecePattern } from '../engine/types.ts';
import { EMPTY_CELL } from '../engine/types.ts';
import { darkenColor, lightenColor } from '../utils/color.ts';

interface CellProps {
  value: CellType;
  row: number;
  col: number;
  blocked: boolean;
  isWinning: boolean;
  isDropping?: boolean;
  dropDistance?: number;
  isShaking?: boolean;
  pattern?: PiecePattern;
  playerColors: Record<number, string>;
  playerOutlineColors: Record<number, string>;
  onClick: (col: number) => void;
  onMouseEnter?: () => void;
}

function getPlayerColor(player: PlayerId, colors: Record<number, string>): string {
  return colors[player] || '#ccc';
}



export const Cell: React.FC<CellProps> = React.memo(function Cell({
  value, col, blocked, isWinning, isDropping, dropDistance, isShaking, pattern, playerColors, playerOutlineColors, onClick, onMouseEnter,
}) {
  const isEmpty = value === EMPTY_CELL;
  const showPattern = !isEmpty && pattern && pattern !== 'solid';
  const color = getPlayerColor(value, playerColors);
  const outlineColor = !isEmpty ? (playerOutlineColors[value] ?? color) : undefined;

  const pieceStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: '80%',
    height: '80%',
    borderRadius: '50%',
    background: isEmpty
      ? (blocked ? 'var(--color-cell-blocked)' : 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, var(--color-bg-card) 60%, #EDE4F5 100%)')
      : `radial-gradient(circle at 35% 35%, ${lightenColor(color, 0.3)} 0%, ${color} 50%, ${darkenColor(color, 0.15)} 100%)`,
    border: !isEmpty && outlineColor ? `3px solid ${outlineColor}` : 'none',
    transition: isDropping ? 'none' : 'background 0.2s ease, transform 0.25s ease',
    transform: isWinning ? 'scale(1.1)' : 'scale(1)',
    ...(isDropping && dropDistance ? {
      animationName: 'pieceDrop',
      animationDuration: '250ms',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'both',
      '--drop-distance': `${-(dropDistance * 100)}%`,
    } as React.CSSProperties : {}),
    boxShadow: isWinning
      ? `0 0 16px ${color}`
      : isEmpty ? 'inset 0 2px 6px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.15)',    ...(blocked && isEmpty ? { animation: 'blockedFadeIn 0.4s ease-out' } : {}),  };

  return (
    <div
      className={`cell${isShaking ? ' cell-shake' : ''}`}
      role="button"
      aria-label={`Column ${col + 1}${isEmpty ? '' : `, Player ${value}`}${blocked ? ', blocked' : ''}`}
      onClick={() => onClick(col)}
      onMouseEnter={onMouseEnter}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1',
        cursor: isEmpty && !blocked ? 'pointer' : 'default',
      }}
    >
      <div className={isWinning ? 'piece-winning' : undefined} style={pieceStyle}>
        {showPattern && (
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <circle cx={50} cy={50} r={50} fill={`url(#pattern-${pattern})`} />
          </svg>
        )}
        {blocked && isEmpty && (
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0.15 }}
          >
            <line x1={10} y1={10} x2={90} y2={90} stroke="#fff" strokeWidth={4} />
            <line x1={90} y1={10} x2={10} y2={90} stroke="#fff" strokeWidth={4} />
          </svg>
        )}
      </div>
    </div>
  );
});
