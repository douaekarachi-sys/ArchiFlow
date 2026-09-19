import { create } from 'zustand';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'archiflow.theme';

/** Préférence d'affichage : localStorage est admis ici, jamais pour une donnée métier. */
function readTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible (navigation privée) : le thème vaut pour la session.
  }
}

interface ThemeState {
  theme: Theme;
  toggle(): void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: readTheme(),
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
