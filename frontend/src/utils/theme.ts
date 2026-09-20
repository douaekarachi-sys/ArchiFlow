import { create } from 'zustand';

/** Préférence choisie par l'utilisateur ; « système » suit prefers-color-scheme (ADR 0015). */
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'archiflow.theme';

/** Stockage indisponible (navigation privée, quota) : on se comporte comme « système ». */
function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Ignoré : préférence « système » par défaut.
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

function apply(resolved: ResolvedTheme): void {
  document.documentElement.dataset['theme'] = resolved;
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference(preference: ThemePreference): void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const preference = readPreference();
  const resolved = resolve(preference);
  if (typeof document !== 'undefined') apply(resolved);

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get().preference !== 'system') return;
      const next = resolve('system');
      apply(next);
      set({ resolved: next });
    });
  }

  return {
    preference,
    resolved,
    setPreference: (next) => {
      try {
        if (next === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Stockage indisponible : le choix vaut pour la session en cours seulement.
      }
      const resolvedNext = resolve(next);
      apply(resolvedNext);
      set({ preference: next, resolved: resolvedNext });
    },
  };
});
