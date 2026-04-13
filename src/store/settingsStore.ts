import { create } from 'zustand';
import { setVolume, setMuted } from '../engine/sound.ts';

const STORAGE_KEY = 'connectx-highContrast';
const REDUCE_MOTION_KEY = 'connectx-reduceMotion';
const MUTED_KEY = 'connectx-muted';
const VOLUME_KEY = 'connectx-volume';
const TEXT_SIZE_KEY = 'connectx-textSize';
const COLORBLIND_KEY = 'connectx-colorblindPatterns';
const THEME_KEY = 'connectx-theme';

function getInitialReduceMotion(): boolean {
  const stored = localStorage.getItem(REDUCE_MOTION_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Theme = 'light' | 'dark' | 'system';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

interface SettingsState {
  highContrast: boolean;
  reduceMotion: boolean;
  colorblindPatterns: boolean;
  muted: boolean;
  volume: number; // 0-1
  textSize: number; // 0 = default, 1 = +1 step, 2 = +2 steps
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  toggleColorblindPatterns: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  setTheme: (theme: Theme) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  highContrast: localStorage.getItem(STORAGE_KEY) === 'true',
  reduceMotion: getInitialReduceMotion(),
  colorblindPatterns: localStorage.getItem(COLORBLIND_KEY) === 'true',
  muted: localStorage.getItem(MUTED_KEY) === 'true',
  volume: parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.5'),
  textSize: Math.min(2, Math.max(0, parseInt(localStorage.getItem(TEXT_SIZE_KEY) ?? '0', 10) || 0)),
  theme: getInitialTheme(),
  resolvedTheme: resolveTheme(getInitialTheme()),
  toggleHighContrast: () =>
    set((state) => {
      const next = !state.highContrast;
      localStorage.setItem(STORAGE_KEY, String(next));
      return { highContrast: next };
    }),
  toggleReduceMotion: () =>
    set((state) => {
      const next = !state.reduceMotion;
      localStorage.setItem(REDUCE_MOTION_KEY, String(next));
      return { reduceMotion: next };
    }),
  toggleColorblindPatterns: () =>
    set((state) => {
      const next = !state.colorblindPatterns;
      localStorage.setItem(COLORBLIND_KEY, String(next));
      return { colorblindPatterns: next };
    }),
  toggleMute: () =>
    set((state) => {
      const next = !state.muted;
      localStorage.setItem(MUTED_KEY, String(next));
      setMuted(next);
      return { muted: next };
    }),
  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    localStorage.setItem(VOLUME_KEY, String(clamped));
    setVolume(clamped);
    set({ volume: clamped });
  },
  increaseTextSize: () =>
    set((state) => {
      const next = Math.min(2, state.textSize + 1);
      localStorage.setItem(TEXT_SIZE_KEY, String(next));
      return { textSize: next };
    }),
  decreaseTextSize: () =>
    set((state) => {
      const next = Math.max(0, state.textSize - 1);
      localStorage.setItem(TEXT_SIZE_KEY, String(next));
      return { textSize: next };
    }),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    set({ theme, resolvedTheme: resolveTheme(theme) });
  },
}));

// Listen for OS theme changes to update resolvedTheme when theme === 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme } = useSettingsStore.getState();
  if (theme === 'system') {
    useSettingsStore.setState({ resolvedTheme: resolveTheme('system') });
  }
});

// Sync audio engine with persisted settings on load
const initialSettings = useSettingsStore.getState();
setVolume(initialSettings.volume);
setMuted(initialSettings.muted);
