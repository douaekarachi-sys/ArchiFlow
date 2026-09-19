import type { AuthResult, UserProfile } from '@archiflow/shared';
import { create } from 'zustand';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  /**
   * Jeton d'accès EN MÉMOIRE uniquement : jamais dans localStorage, où un script injecté le
   * lirait. Le jeton de rafraîchissement, lui, est dans un cookie httpOnly que ce code ne voit pas.
   */
  accessToken: string | null;
  profile: UserProfile | null;
  setSession(result: AuthResult): void;
  setProfile(profile: UserProfile): void;
  clear(): void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'unknown',
  accessToken: null,
  profile: null,
  setSession: (result) => set({ status: 'authenticated', accessToken: result.accessToken, profile: result.profile }),
  setProfile: (profile) => set({ profile }),
  clear: () => set({ status: 'anonymous', accessToken: null, profile: null }),
}));
