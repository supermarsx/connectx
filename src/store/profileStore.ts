import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlayerProfile {
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  favoriteColor: string;
  unlockedColors: string[];
  unlockedTitles: string[];
  currentTitle: string;
}

interface ProfileActions {
  setUsername: (name: string) => void;
  recordGameResult: (won: boolean) => void;
  unlockColor: (color: string) => void;
  unlockTitle: (title: string) => void;
  setTitle: (title: string) => void;
  setFavoriteColor: (color: string) => void;
}

export type ProfileStore = PlayerProfile & ProfileActions;

const defaultProfile: PlayerProfile = {
  username: '',
  gamesPlayed: 0,
  gamesWon: 0,
  favoriteColor: '#FF6FAF',
  unlockedColors: [],
  unlockedTitles: ['Rookie'],
  currentTitle: 'Rookie',
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      ...defaultProfile,

      setUsername: (name: string) => {
        const sanitized = name.replace(/<[^>]*>/g, '').trim().slice(0, 20);
        set({ username: sanitized });
      },

      recordGameResult: (won: boolean) => {
        const state = get();
        const gamesPlayed = state.gamesPlayed + 1;
        const gamesWon = state.gamesWon + (won ? 1 : 0);
        const newColors = [...state.unlockedColors];
        const newTitles = [...state.unlockedTitles];

        const addTitle = (t: string) => { if (!newTitles.includes(t)) newTitles.push(t); };
        const addColor = (c: string) => { if (!newColors.includes(c)) newColors.push(c); };

        if (gamesPlayed >= 1) addTitle('First Timer');
        if (gamesWon >= 5) { addTitle('Rising Star'); addColor('#FF4B6E'); }
        if (gamesWon >= 10) { addTitle('Veteran'); addColor('#4CD08A'); }
        if (gamesWon >= 25) { addTitle('Champion'); addColor('#FFD700'); }
        if (gamesWon >= 50) addTitle('Legend');

        set({
          gamesPlayed,
          gamesWon,
          unlockedColors: newColors,
          unlockedTitles: newTitles,
        });
      },

      unlockColor: (color: string) => {
        const { unlockedColors } = get();
        if (!unlockedColors.includes(color)) {
          set({ unlockedColors: [...unlockedColors, color] });
        }
      },

      unlockTitle: (title: string) => {
        const { unlockedTitles } = get();
        if (!unlockedTitles.includes(title)) {
          set({ unlockedTitles: [...unlockedTitles, title] });
        }
      },

      setTitle: (title: string) => {
        const { unlockedTitles } = get();
        if (unlockedTitles.includes(title)) {
          set({ currentTitle: title });
        }
      },

      setFavoriteColor: (color: string) => set({ favoriteColor: color }),
    }),
    { name: 'connectx-profile' },
  ),
);
