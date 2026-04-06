import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Web Audio API
const mockGainNode = {
  gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
};

const mockOscillator = {
  type: 'sine',
  frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockBufferSource = {
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockFilter = {
  type: 'bandpass',
  frequency: { value: 0 },
  Q: { value: 0 },
  connect: vi.fn(),
};

const mockAudioCtx = {
  currentTime: 0,
  state: 'running',
  sampleRate: 44100,
  resume: vi.fn(),
  destination: {},
  createGain: vi.fn(() => ({ ...mockGainNode, gain: { ...mockGainNode.gain, value: 0 } })),
  createOscillator: vi.fn(() => ({ ...mockOscillator, frequency: { ...mockOscillator.frequency }, type: 'sine' })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  createBiquadFilter: vi.fn(() => ({ ...mockFilter, frequency: { value: 0 }, Q: { value: 0 } })),
  createBuffer: vi.fn((_channels: number, length: number, _sampleRate: number) => ({
    getChannelData: vi.fn(() => new Float32Array(length)),
  })),
};

vi.stubGlobal('AudioContext', vi.fn(() => mockAudioCtx));

import { setVolume, setMuted, getVolume, isMuted, playDrop, playTurnChange, playWin, playDrawLoss } from '../engine/sound.ts';

beforeEach(() => {
  vi.clearAllMocks();
  setVolume(0.5);
  setMuted(false);
});

describe('volume control', () => {
  it('setVolume stores value and getVolume returns it', () => {
    setVolume(0.8);
    expect(getVolume()).toBe(0.8);
  });

  it('setVolume clamps to 0-1 (below 0)', () => {
    setVolume(-1);
    expect(getVolume()).toBe(0);
  });

  it('setVolume clamps to 0-1 (above 1)', () => {
    setVolume(5);
    expect(getVolume()).toBe(1);
  });
});

describe('mute control', () => {
  it('setMuted(true) makes isMuted() return true', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
  });

  it('setMuted(false) makes isMuted() return false', () => {
    setMuted(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });
});

describe('playDrop', () => {
  it('does not throw', () => {
    expect(() => playDrop()).not.toThrow();
  });

  it('creates buffer source and oscillator', () => {
    playDrop();
    expect(mockAudioCtx.createBufferSource).toHaveBeenCalled();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
  });
});

describe('playTurnChange', () => {
  it('does not throw', () => {
    expect(() => playTurnChange()).not.toThrow();
  });

  it('creates an oscillator', () => {
    mockAudioCtx.createOscillator.mockClear();
    playTurnChange();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
  });
});

describe('playWin', () => {
  it('does not throw', () => {
    expect(() => playWin()).not.toThrow();
  });

  it('creates 4 oscillators (one per note)', () => {
    mockAudioCtx.createOscillator.mockClear();
    playWin();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(4);
  });
});

describe('playDrawLoss', () => {
  it('does not throw', () => {
    expect(() => playDrawLoss()).not.toThrow();
  });

  it('creates 2 oscillators (one per note)', () => {
    mockAudioCtx.createOscillator.mockClear();
    playDrawLoss();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(2);
  });
});

describe('play functions when muted', () => {
  it('playDrop does not throw when muted', () => {
    setMuted(true);
    expect(() => playDrop()).not.toThrow();
  });

  it('playTurnChange does not throw when muted', () => {
    setMuted(true);
    expect(() => playTurnChange()).not.toThrow();
  });

  it('playWin does not throw when muted', () => {
    setMuted(true);
    expect(() => playWin()).not.toThrow();
  });

  it('playDrawLoss does not throw when muted', () => {
    setMuted(true);
    expect(() => playDrawLoss()).not.toThrow();
  });
});
