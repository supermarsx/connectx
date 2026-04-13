import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Board as BoardType, PlayerId, BoardConfig, PlayerConfig, GameMode } from '../engine/types.ts';
import { EMPTY_CELL, PIECE_PATTERNS } from '../engine/types.ts';
import { getWinningCells } from '../engine/winDetection.ts';
import { Cell } from './Cell.tsx';
import { PiecePatternDefs } from './PiecePatternDefs.tsx';

interface BoardProps {
  board: BoardType;
  config: BoardConfig;
  blocked: boolean[][];
  winner: PlayerId | null;
  lastMove: { row: number; col: number } | null;
  players: PlayerConfig[];
  onColumnClick: (col: number) => void;
  mode: GameMode;
  currentPlayerColor: string;
  gameActive: boolean;
  shakeColumn: number | null;
  forceColorblindPatterns?: boolean;
}

export const Board: React.FC<BoardProps> = React.memo(function Board({
  board, config, blocked, winner, lastMove, players, onColumnClick, mode, currentPlayerColor, gameActive, shakeColumn, forceColorblindPatterns,
}) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [droppingCell, setDroppingCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    if (lastMove) {
      setDroppingCell({ row: lastMove.row, col: lastMove.col });
      const timer = setTimeout(() => setDroppingCell(null), 280);
      return () => clearTimeout(timer);
    }
  }, [lastMove]);
  const playerColors = useMemo(() => {
    const map: Record<number, string> = {};
    players.forEach(p => { map[p.id] = p.color; });
    return map;
  }, [players]);

  const playerOutlineColors = useMemo(() => {
    const map: Record<number, string> = {};
    players.forEach(p => { map[p.id] = p.outlineColor ?? p.color; });
    return map;
  }, [players]);

  const winningSet = useMemo(() => {
    if (!winner || !lastMove) return new Set<string>();
    const cells = getWinningCells(board, lastMove.row, lastMove.col, config.connectN);
    if (!cells) return new Set<string>();
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, [board, winner, lastMove, config.connectN]);

  const handleBoardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!gameActive) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredCol(prev => prev === null ? config.cols - 1 : (prev - 1 + config.cols) % config.cols);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredCol(prev => prev === null ? 0 : (prev + 1) % config.cols);
    } else if ((e.key === 'Enter' || e.key === ' ') && hoveredCol !== null) {
      e.preventDefault();
      onColumnClick(hoveredCol);
    }
  }, [gameActive, hoveredCol, config.cols, onColumnClick]);

  return (
    <div
      onMouseLeave={() => setHoveredCol(null)}
      onKeyDown={handleBoardKeyDown}
      tabIndex={0}
      aria-label="Game board - use arrow keys to select column, Enter to drop piece"
      style={{ maxWidth: '560px', width: '100%', margin: '0 auto', outline: 'none' }}
    >
      {/* Ghost piece preview row */}
      {gameActive && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gap: '6px',
          padding: '0 16px',
          height: '48px',
        }}>
          {Array.from({ length: config.cols }, (_, colIdx) => (
            <div key={colIdx} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {hoveredCol === colIdx && (
                <div className="ghost-piece" style={{
                  width: '70%', height: '70%', borderRadius: '50%',
                  backgroundColor: currentPlayerColor,
                  opacity: 0.4,
                }} />
              )}
            </div>
          ))}
        </div>
      )}
      <div
        key={mode}
        className="board"
        role="grid"
        aria-label="Game board"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gap: '6px',
          padding: '16px',
          backgroundColor: mode === 'classic' ? 'var(--color-board-classic)' : 'var(--color-board-fullboard)',
          borderRadius: '20px',
          width: '100%',
          boxShadow: mode === 'classic'
            ? '0 8px 32px rgba(180,180,220,0.4), inset 0 2px 12px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(100,80,160,0.4), inset 0 2px 12px rgba(0,0,0,0.4)',
          position: 'relative',
          animation: 'boardFlipIn 0.4s ease-out',
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        }}
      >
        <PiecePatternDefs />
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const player = cell !== EMPTY_CELL ? players.find(p => p.id === cell) : undefined;
            return (
              <Cell
                key={`${rowIdx}-${colIdx}`}
                value={cell}
                row={rowIdx}
                col={colIdx}
                blocked={blocked[rowIdx]?.[colIdx] ?? false}
                isWinning={winningSet.has(`${rowIdx},${colIdx}`)}
                isDropping={droppingCell?.row === rowIdx && droppingCell?.col === colIdx}
                dropDistance={droppingCell?.row === rowIdx && droppingCell?.col === colIdx ? rowIdx + 1 : undefined}
                isShaking={shakeColumn === colIdx}
                playerColors={playerColors}
                playerOutlineColors={playerOutlineColors}
                pattern={forceColorblindPatterns ? (PIECE_PATTERNS[(player?.id ?? 1) - 1] ?? 'solid') : player?.pattern}
                onClick={onColumnClick}
                onMouseEnter={() => { if (gameActive) setHoveredCol(colIdx); }}
              />
            );
          })
        )}
      </div>
    </div>
  );
});
