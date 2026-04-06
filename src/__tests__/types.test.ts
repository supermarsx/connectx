import { describe, it, expect } from 'vitest';
import {
  EMPTY_CELL, DEFAULT_BOARD_CONFIG, PLAYER_COLORS, PLAYER_OUTLINE_COLORS,
  PIECE_PATTERNS, PIECE_COLOR_PALETTE, HIGH_CONTRAST_COLORS,
  PLAYER_AVATARS, DEFAULT_AVATARS, BOARD_SIZE_PRESETS,
} from '../engine/types.ts';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

describe('Type constants', () => {
  it('1. EMPTY_CELL equals 0', () => {
    expect(EMPTY_CELL).toBe(0);
  });

  it('2. DEFAULT_BOARD_CONFIG has rows=6, cols=7, connectN=4', () => {
    expect(DEFAULT_BOARD_CONFIG).toEqual({ rows: 6, cols: 7, connectN: 4 });
  });

  it('3. PLAYER_COLORS has 4 entries', () => {
    expect(PLAYER_COLORS).toHaveLength(4);
  });

  it('4. PLAYER_COLORS entries are valid hex colors', () => {
    for (const c of PLAYER_COLORS) {
      expect(c).toMatch(HEX_COLOR_RE);
    }
  });

  it('5. PLAYER_OUTLINE_COLORS has same length as PLAYER_COLORS', () => {
    expect(PLAYER_OUTLINE_COLORS).toHaveLength(PLAYER_COLORS.length);
  });

  it('6. PLAYER_OUTLINE_COLORS entries are valid hex colors', () => {
    for (const c of PLAYER_OUTLINE_COLORS) {
      expect(c).toMatch(HEX_COLOR_RE);
    }
  });

  it('7. PIECE_PATTERNS has 4 entries: solid, stripe, dot, crosshatch', () => {
    expect(PIECE_PATTERNS).toHaveLength(4);
    expect(PIECE_PATTERNS).toEqual(['solid', 'stripe', 'dot', 'crosshatch']);
  });

  it('8. PIECE_COLOR_PALETTE has 12 entries', () => {
    expect(PIECE_COLOR_PALETTE).toHaveLength(12);
  });

  it('9. PIECE_COLOR_PALETTE has no duplicates', () => {
    const unique = new Set(PIECE_COLOR_PALETTE);
    expect(unique.size).toBe(PIECE_COLOR_PALETTE.length);
  });

  it('10. PIECE_COLOR_PALETTE entries are valid hex colors', () => {
    for (const c of PIECE_COLOR_PALETTE) {
      expect(c).toMatch(HEX_COLOR_RE);
    }
  });

  it('11. HIGH_CONTRAST_COLORS has 4 entries', () => {
    expect(HIGH_CONTRAST_COLORS).toHaveLength(4);
  });

  it('12. HIGH_CONTRAST_COLORS are valid hex colors', () => {
    for (const c of HIGH_CONTRAST_COLORS) {
      expect(c).toMatch(HEX_COLOR_RE);
    }
  });

  it('13. PLAYER_AVATARS has 8 entries', () => {
    expect(PLAYER_AVATARS).toHaveLength(8);
  });

  it('14. DEFAULT_AVATARS has 4 entries', () => {
    expect(DEFAULT_AVATARS).toHaveLength(4);
  });

  it('15. DEFAULT_AVATARS are all in PLAYER_AVATARS', () => {
    for (const a of DEFAULT_AVATARS) {
      expect(PLAYER_AVATARS).toContain(a);
    }
  });

  it('16. BOARD_SIZE_PRESETS has 5 entries', () => {
    expect(BOARD_SIZE_PRESETS).toHaveLength(5);
  });

  it('17. Each BOARD_SIZE_PRESET has key, label, rows, cols, connectN', () => {
    for (const preset of BOARD_SIZE_PRESETS) {
      expect(preset).toHaveProperty('key');
      expect(preset).toHaveProperty('label');
      expect(preset).toHaveProperty('rows');
      expect(preset).toHaveProperty('cols');
      expect(preset).toHaveProperty('connectN');
    }
  });

  it('18. BOARD_SIZE_PRESETS rows/cols are positive integers', () => {
    for (const preset of BOARD_SIZE_PRESETS) {
      expect(Number.isInteger(preset.rows)).toBe(true);
      expect(Number.isInteger(preset.cols)).toBe(true);
      expect(preset.rows).toBeGreaterThan(0);
      expect(preset.cols).toBeGreaterThan(0);
    }
  });

  it('19. BOARD_SIZE_PRESETS connectN <= min(rows, cols)', () => {
    for (const preset of BOARD_SIZE_PRESETS) {
      expect(preset.connectN).toBeLessThanOrEqual(Math.min(preset.rows, preset.cols));
    }
  });

  it('20. No duplicate keys in BOARD_SIZE_PRESETS', () => {
    const keys = BOARD_SIZE_PRESETS.map(p => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('21. PLAYER_COLORS are all different from each other', () => {
    const unique = new Set(PLAYER_COLORS);
    expect(unique.size).toBe(PLAYER_COLORS.length);
  });

  it('22. HIGH_CONTRAST_COLORS are all different from each other', () => {
    const unique = new Set(HIGH_CONTRAST_COLORS);
    expect(unique.size).toBe(HIGH_CONTRAST_COLORS.length);
  });
});
