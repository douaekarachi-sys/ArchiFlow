import { ROLE_HOME, type Role } from '@archiflow/shared';
import { useEffect, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { refreshSession } from '@/api/client';
import { Skeleton } from '@/components/ui/states';
import { useSession } from './session-store';

export const CHANGE_PASSWORD_PATH = '/change-password';

/**
 * Au chargement de l'application, tente de restaurer la session depuis le cookie httpOnly.
 * Tant que la réponse n'est pas connue, l'interface affiche un squelette, jamais un écran blanc.
 */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status);
  useEffect(() => {
    if (status === 'unknown') void refreshSession();
  }, [status]);
  if (status === 'unknown') return <FullPageSkeleton />;
  return children;
}

function FullPageSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true">
      <div className="hidden w-60 flex-col gap-3 border-r border-line bg-surface p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-6 h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

/**
 * Routes authentifiées. Le rôle ne sert ici qu'à la NAVIGATION : chaque décision d'autorisation
 * est revérifiée par le backend (brief §0.5).
 */
export function RequireAuth() {
  const { status, profile } = useSession();
  const location = useLocation();

  if (status !== 'authenticated' || !profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (profile.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }
  return <Outlet />;
}

/** Portail réservé à un rôle ; un autre rôle est renvoyé vers SON portail. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const profile = useSession((s) => s.profile);
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== role) return <Navigate to={ROLE_HOME[profile.role]} replace />;
  return children;
}

/** Pages publiques (connexion…) : un utilisateur déjà connecté va directement à son portail. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const profile = useSession((s) => s.profile);
  if (profile) return <Navigate to={profile.mustChangePassword ? CHANGE_PASSWORD_PATH : ROLE_HOME[profile.role]} replace />;
  return children;
}

export function RoleHomeRedirect() {
  const profile = useSession((s) => s.profile);
  return <Navigate to={profile ? ROLE_HOME[profile.role] : '/login'} replace />;
}
