import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock sound module to prevent Web Audio API errors
vi.mock('../engine/sound.ts', () => ({
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  getVolume: vi.fn(() => 0.5),
  isMuted: vi.fn(() => false),
}));

import { useProfileStore } from '../store/profileStore.ts';

beforeEach(() => {
  localStorage.clear();
  useProfileStore.setState({
    username: '',
    gamesPlayed: 0,
    gamesWon: 0,
    favoriteColor: '#FF6FAF',
    unlockedColors: [],
    unlockedTitles: ['Rookie'],
    currentTitle: 'Rookie',
  });
});

describe('profileStore defaults', () => {
  it('default username is empty', () => {
    expect(useProfileStore.getState().username).toBe('');
  });

  it('default gamesPlayed is 0', () => {
    expect(useProfileStore.getState().gamesPlayed).toBe(0);
  });

  it('default gamesWon is 0', () => {
    expect(useProfileStore.getState().gamesWon).toBe(0);
  });

  it('default currentTitle is Rookie', () => {
    expect(useProfileStore.getState().currentTitle).toBe('Rookie');
  });

  it('default unlockedTitles contains Rookie', () => {
    expect(useProfileStore.getState().unlockedTitles).toContain('Rookie');
  });
});

describe('setUsername', () => {
  it('sets the username', () => {
    useProfileStore.getState().setUsername('Alice');
    expect(useProfileStore.getState().username).toBe('Alice');
  });

  it('strips HTML tags', () => {
    useProfileStore.getState().setUsername('<script>alert</script>');
    expect(useProfileStore.getState().username).toBe('alert');
  });

  it('trims whitespace', () => {
    useProfileStore.getState().setUsername('  Bob  ');
    expect(useProfileStore.getState().username).toBe('Bob');
  });

  it('truncates to 20 characters', () => {
    useProfileStore.getState().setUsername('A'.repeat(30));
    expect(useProfileStore.getState().username).toHaveLength(20);
  });
});

describe('recordGameResult', () => {
  it('increments gamesPlayed and gamesWon on a win', () => {
    useProfileStore.getState().recordGameResult(true);
    const { gamesPlayed, gamesWon } = useProfileStore.getState();
    expect(gamesPlayed).toBe(1);
    expect(gamesWon).toBe(1);
  });

  it('increments gamesPlayed only on a loss', () => {
    useProfileStore.getState().recordGameResult(false);
    const { gamesPlayed, gamesWon } = useProfileStore.getState();
    expect(gamesPlayed).toBe(1);
    expect(gamesWon).toBe(0);
  });

  it('unlocks First Timer after first game played', () => {
    useProfileStore.getState().recordGameResult(false);
    expect(useProfileStore.getState().unlockedTitles).toContain('First Timer');
  });

  it('unlocks Rising Star title and #FF4B6E color at 5 wins', () => {
    for (let i = 0; i < 5; i++) {
      useProfileStore.getState().recordGameResult(true);
    }
    const state = useProfileStore.getState();
    expect(state.unlockedTitles).toContain('Rising Star');
    expect(state.unlockedColors).toContain('#FF4B6E');
  });

  it('unlocks Veteran title and #4CD08A color at 10 wins', () => {
    for (let i = 0; i < 10; i++) {
      useProfileStore.getState().recordGameResult(true);
    }
    const state = useProfileStore.getState();
    expect(state.unlockedTitles).toContain('Veteran');
    expect(state.unlockedColors).toContain('#4CD08A');
  });

  it('unlocks Champion title and #FFD700 color at 25 wins', () => {
    for (let i = 0; i < 25; i++) {
      useProfileStore.getState().recordGameResult(true);
    }
    const state = useProfileStore.getState();
    expect(state.unlockedTitles).toContain('Champion');
    expect(state.unlockedColors).toContain('#FFD700');
  });

  it('unlocks Legend title at 50 wins', () => {
    for (let i = 0; i < 50; i++) {
      useProfileStore.getState().recordGameResult(true);
    }
    expect(useProfileStore.getState().unlockedTitles).toContain('Legend');
  });
});

describe('unlockColor', () => {
  it('adds a color to unlockedColors', () => {
    useProfileStore.getState().unlockColor('#123456');
    expect(useProfileStore.getState().unlockedColors).toContain('#123456');
  });

  it('does not duplicate existing colors', () => {
    useProfileStore.getState().unlockColor('#ABC');
    useProfileStore.getState().unlockColor('#ABC');
    expect(useProfileStore.getState().unlockedColors.filter((c) => c === '#ABC')).toHaveLength(1);
  });
});

describe('unlockTitle', () => {
  it('adds a title to unlockedTitles', () => {
    useProfileStore.getState().unlockTitle('Hero');
    expect(useProfileStore.getState().unlockedTitles).toContain('Hero');
  });

  it('does not duplicate existing titles', () => {
    useProfileStore.getState().unlockTitle('Rookie');
    expect(useProfileStore.getState().unlockedTitles.filter((t) => t === 'Rookie')).toHaveLength(1);
  });
});

describe('setTitle', () => {
  it('changes currentTitle if the title is unlocked', () => {
    useProfileStore.getState().unlockTitle('Hero');
    useProfileStore.getState().setTitle('Hero');
    expect(useProfileStore.getState().currentTitle).toBe('Hero');
  });

  it('does NOT change currentTitle if the title is not unlocked', () => {
    useProfileStore.getState().setTitle('NonExistent');
    expect(useProfileStore.getState().currentTitle).toBe('Rookie');
  });
});

describe('setFavoriteColor', () => {
  it('changes favoriteColor', () => {
    useProfileStore.getState().setFavoriteColor('#00FF00');
    expect(useProfileStore.getState().favoriteColor).toBe('#00FF00');
  });
});
