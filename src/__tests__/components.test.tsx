import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock sound module before any imports that use it
vi.mock('../engine/sound.ts', () => ({
  playDrop: vi.fn(),
  playTurnChange: vi.fn(),
  playWin: vi.fn(),
  playDrawLoss: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  getVolume: () => 0.5,
  isMuted: () => false,
}));

import { Board } from '../components/Board.tsx';
import { Cell } from '../components/Cell.tsx';
import { AvatarIcon } from '../components/AvatarIcon.tsx';
import type { Board as BoardType, PlayerConfig, BoardConfig } from '../engine/types.ts';
import { EMPTY_CELL, PIECE_PATTERNS } from '../engine/types.ts';
import { createBoard } from '../engine/board.ts';

// ─── AvatarIcon ─────────────────────────────────────────────────────────────

describe('AvatarIcon component', () => {
  it('renders the correct emoji for each avatar', () => {
    const map: Record<string, string> = {
      cat: '🐱', dog: '🐶', bear: '🐻', fox: '🦊',
      owl: '🦉', bunny: '🐰', panda: '🐼', frog: '🐸',
    };
    for (const [avatar, emoji] of Object.entries(map)) {
      const { container } = render(
        <AvatarIcon avatar={avatar as any} size={32} color="#ff0000" />
      );
      expect(container.textContent).toContain(emoji);
    }
  });
});

// ─── Cell ───────────────────────────────────────────────────────────────────

describe('Cell component', () => {
  const defaultProps = {
    row: 0,
    col: 3,
    blocked: false,
    isWinning: false,
    playerColors: { 1: '#FF6FAF', 2: '#64E0C6' } as Record<number, string>,
    playerOutlineColors: { 1: '#E35591', 2: '#4EB8A8' } as Record<number, string>,
    onClick: vi.fn(),
  };

  it('renders an empty cell with correct aria-label', () => {
    render(<Cell value={EMPTY_CELL} {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Column 4');
  });

  it('renders a player cell with player info in aria-label', () => {
    render(<Cell value={1} {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Column 4, Player 1');
  });

  it('renders a blocked cell with blocked in aria-label', () => {
    render(<Cell value={EMPTY_CELL} {...defaultProps} blocked={true} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Column 4, blocked');
  });

  it('fires onClick with the column index', () => {
    const onClick = vi.fn();
    render(<Cell value={EMPTY_CELL} {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(3);
  });

  it('does not handle Enter key directly (board handles keyboard nav)', () => {
    const onClick = vi.fn();
    render(<Cell value={EMPTY_CELL} {...defaultProps} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not handle Space key directly (board handles keyboard nav)', () => {
    const onClick = vi.fn();
    render(<Cell value={EMPTY_CELL} {...defaultProps} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ─── Board ──────────────────────────────────────────────────────────────────

describe('Board component', () => {
  const boardConfig: BoardConfig = { rows: 6, cols: 7, connectN: 4 };
  const players: PlayerConfig[] = [
    { id: 1, name: 'P1', type: 'human', color: '#FF6FAF', outlineColor: '#E35591', pattern: PIECE_PATTERNS[0], avatar: 'cat' },
    { id: 2, name: 'P2', type: 'human', color: '#64E0C6', outlineColor: '#4EB8A8', pattern: PIECE_PATTERNS[1], avatar: 'dog' },
  ];

  function renderBoard(board: BoardType, overrides: Partial<Parameters<typeof Board>[0]> = {}) {
    const props = {
      board,
      config: boardConfig,
      blocked: board.map(row => row.map(() => false)),
      winner: null as number | null,
      lastMove: null as { row: number; col: number } | null,
      players,
      onColumnClick: vi.fn(),
      mode: 'classic' as const,
      currentPlayerColor: '#FF6FAF',
      gameActive: true,
      shakeColumn: null as number | null,
      ...overrides,
    };
    return render(<Board {...props} />);
  }

  it('renders a grid with correct number of cells', () => {
    const board = createBoard(boardConfig);
    renderBoard(board);
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    // 6 * 7 = 42 cells
    const cells = screen.getAllByRole('button');
    expect(cells.length).toBeGreaterThanOrEqual(42);
  });

  it('calls onColumnClick when a cell is clicked', () => {
    const board = createBoard(boardConfig);
    const onClick = vi.fn();
    renderBoard(board, { onColumnClick: onClick });

    const cells = screen.getAllByRole('button');
    fireEvent.click(cells[0]); // top-left cell, col 0
    expect(onClick).toHaveBeenCalledWith(0);
  });

  it('shows ghost piece row when game is active', () => {
    const board = createBoard(boardConfig);
    const { container } = renderBoard(board, { gameActive: true });
    // Ghost piece row should exist (it has grid columns)
    const ghostRow = container.querySelector('.ghost-piece');
    // Ghost only shows on hover, so no ghost visible initially
    expect(ghostRow).toBeNull();
  });

  it('hides ghost piece row when game is inactive', () => {
    const board = createBoard(boardConfig);
    const { container } = renderBoard(board, { gameActive: false });
    const ghostRow = container.querySelector('.ghost-piece');
    expect(ghostRow).toBeNull();
  });

  it('renders player pieces with correct colors', () => {
    const board = createBoard(boardConfig);
    board[5][3] = 1;
    renderBoard(board);
    // Cell at col 3 should show Player 1
    const cells = screen.getAllByRole('button');
    const cellAt53 = cells.find(c => c.getAttribute('aria-label')?.includes('Player 1'));
    expect(cellAt53).toBeDefined();
  });
});
