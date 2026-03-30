import { create } from 'zustand';
import { setVolume, setMuted } from '../engine/sound.ts';

const STORAGE_KEY = 'connectx-highContrast';
const REDUCE_MOTION_KEY = 'connectx-reduceMotion';
const MUTED_KEY = 'connectx-muted';
const VOLUME_KEY = 'connectx-volume';
const TEXT_SIZE_KEY = 'connectx-textSize';

function getInitialReduceMotion(): boolean {
  const stored = localStorage.getItem(REDUCE_MOTION_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface SettingsState {
  highContrast: boolean;
  reduceMotion: boolean;
  muted: boolean;
  volume: number; // 0-1
  textSize: number; // 0 = default, 1 = +1 step, 2 = +2 steps
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  highContrast: localStorage.getItem(STORAGE_KEY) === 'true',
  reduceMotion: getInitialReduceMotion(),
  muted: localStorage.getItem(MUTED_KEY) === 'true',
  volume: parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.5'),
  textSize: Math.min(2, Math.max(0, parseInt(localStorage.getItem(TEXT_SIZE_KEY) ?? '0', 10) || 0)),
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
}));

// Sync audio engine with persisted settings on load
const initialSettings = useSettingsStore.getState();
setVolume(initialSettings.volume);
setMuted(initialSettings.muted);
