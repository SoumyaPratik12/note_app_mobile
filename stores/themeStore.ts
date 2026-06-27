import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  theme: 'light' | 'dark';
  pushNotif: boolean;
  recentSearches: string[];
  toggleTheme: () => void;
  togglePush: () => void;
  addSearchQuery: (query: string) => void;
  clearSearchQueries: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      pushNotif: true,
      recentSearches: ['Q3 Planning', 'Sourdough Recipe', 'Book Ideas'],
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      togglePush: () => set((state) => ({ pushNotif: !state.pushNotif })),
      addSearchQuery: (query) => set((state) => {
        const trimmed = query.trim();
        if (!trimmed) return {};
        const filtered = state.recentSearches.filter((q) => q !== trimmed);
        return {
          recentSearches: [trimmed, ...filtered].slice(0, 5),
        };
      }),
      clearSearchQueries: () => set({ recentSearches: [] }),
    }),
    {
      name: 'inksync-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Theme values matching CSS variables in HTML mockup
export const themeColors = {
  light: {
    paper: '#f4f1ea',
    surface: '#fffdf8',
    surface2: '#faf7f0',
    ink: '#211f1b',
    ink2: '#6b665d',
    ink3: '#9a948a',
    line: '#e7e2d8',
    accent: '#1f6f5c',
    accentPress: '#19594a',
    accentSoft: '#e4efe9',
    accentInk: '#ffffff',
    low: '#bd6a1e',
    shadow: 'rgba(40,36,28,0.14)',
    scrim: 'rgba(20,18,14,0.55)',
  },
  dark: {
    paper: '#0e0d0a',
    surface: '#171512',
    surface2: '#1c1915',
    ink: '#f4f1ea',
    ink2: '#9a948a',
    ink3: '#6b665d',
    line: '#2e2a24',
    accent: '#3da28b',
    accentPress: '#2f7e6c',
    accentSoft: 'rgba(61,162,139,0.15)',
    accentInk: '#0e0d0a',
    low: '#d6893e',
    shadow: 'rgba(0,0,0,0.35)',
    scrim: 'rgba(0,0,0,0.7)',
  },
};
export type ThemeColors = typeof themeColors.light;
