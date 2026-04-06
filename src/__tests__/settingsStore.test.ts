import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must run before any module evaluation — vi.hoisted is processed before vi.mock and imports
vi.hoisted(() => {
  (globalThis as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

// Mock sound module
vi.mock('../engine/sound.ts', () => ({
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  getVolume: vi.fn(() => 0.5),
  isMuted: vi.fn(() => false),
}));

import { useSettingsStore } from '../store/settingsStore.ts';
import { setVolume, setMuted } from '../engine/sound.ts';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useSettingsStore.setState({
    highContrast: false,
    reduceMotion: false,
    muted: false,
    volume: 0.5,
    textSize: 0,
  });
});

describe('settingsStore defaults', () => {
  it('default highContrast is false', () => {
    expect(useSettingsStore.getState().highContrast).toBe(false);
  });

  it('default muted is false', () => {
    expect(useSettingsStore.getState().muted).toBe(false);
  });

  it('default volume is 0.5', () => {
    expect(useSettingsStore.getState().volume).toBe(0.5);
  });

  it('default textSize is 0', () => {
    expect(useSettingsStore.getState().textSize).toBe(0);
  });
});

describe('toggleHighContrast', () => {
  it('flips highContrast value', () => {
    useSettingsStore.getState().toggleHighContrast();
    expect(useSettingsStore.getState().highContrast).toBe(true);
  });

  it('persists to localStorage', () => {
    useSettingsStore.getState().toggleHighContrast();
    expect(localStorage.getItem('connectx-highContrast')).toBe('true');
  });

  it('double toggle returns to original value', () => {
    useSettingsStore.getState().toggleHighContrast();
    useSettingsStore.getState().toggleHighContrast();
    expect(useSettingsStore.getState().highContrast).toBe(false);
  });
});

describe('toggleReduceMotion', () => {
  it('flips reduceMotion value', () => {
    useSettingsStore.getState().toggleReduceMotion();
    expect(useSettingsStore.getState().reduceMotion).toBe(true);
  });

  it('persists to localStorage', () => {
    useSettingsStore.getState().toggleReduceMotion();
    expect(localStorage.getItem('connectx-reduceMotion')).toBe('true');
  });
});

describe('toggleMute', () => {
  it('flips muted value', () => {
    useSettingsStore.getState().toggleMute();
    expect(useSettingsStore.getState().muted).toBe(true);
  });

  it('persists to localStorage', () => {
    useSettingsStore.getState().toggleMute();
    expect(localStorage.getItem('connectx-muted')).toBe('true');
  });

  it('calls setMuted from sound engine', () => {
    useSettingsStore.getState().toggleMute();
    expect(setMuted).toHaveBeenCalledWith(true);
  });

  it('double toggle returns to original muted value', () => {
    useSettingsStore.getState().toggleMute();
    useSettingsStore.getState().toggleMute();
    expect(useSettingsStore.getState().muted).toBe(false);
  });
});

describe('setVolume', () => {
  it('sets the volume', () => {
    useSettingsStore.getState().setVolume(0.8);
    expect(useSettingsStore.getState().volume).toBe(0.8);
  });

  it('clamps negative values to 0', () => {
    useSettingsStore.getState().setVolume(-0.5);
    expect(useSettingsStore.getState().volume).toBe(0);
  });

  it('clamps values above 1 to 1', () => {
    useSettingsStore.getState().setVolume(2);
    expect(useSettingsStore.getState().volume).toBe(1);
  });

  it('persists to localStorage', () => {
    useSettingsStore.getState().setVolume(0.8);
    expect(localStorage.getItem('connectx-volume')).toBe('0.8');
  });

  it('calls setVolume from sound engine', () => {
    useSettingsStore.getState().setVolume(0.8);
    expect(setVolume).toHaveBeenCalledWith(0.8);
  });
});

describe('textSize', () => {
  it('increaseTextSize increases by 1', () => {
    useSettingsStore.getState().increaseTextSize();
    expect(useSettingsStore.getState().textSize).toBe(1);
  });

  it('increaseTextSize caps at 2', () => {
    useSettingsStore.getState().increaseTextSize();
    useSettingsStore.getState().increaseTextSize();
    useSettingsStore.getState().increaseTextSize();
    expect(useSettingsStore.getState().textSize).toBe(2);
  });

  it('decreaseTextSize decreases by 1', () => {
    useSettingsStore.getState().increaseTextSize();
    useSettingsStore.getState().decreaseTextSize();
    expect(useSettingsStore.getState().textSize).toBe(0);
  });

  it('decreaseTextSize does not go below 0', () => {
    useSettingsStore.getState().decreaseTextSize();
    expect(useSettingsStore.getState().textSize).toBe(0);
  });

  it('increaseTextSize persists to localStorage', () => {
    useSettingsStore.getState().increaseTextSize();
    expect(localStorage.getItem('connectx-textSize')).toBe('1');
  });
});
