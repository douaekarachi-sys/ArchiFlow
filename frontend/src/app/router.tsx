import { ROLE_HOME, ROLES, type Role } from '@archiflow/shared';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RedirectIfAuthenticated, RequireAuth, RequireRole, RoleHomeRedirect } from '@/auth/guards';
import { Skeleton } from '@/components/ui/states';
import { NotFoundPage } from '@/features/errors/not-found-page';

/*
 * Code splitting : chaque groupe d'écrans est un chunk chargé à la demande. La future scène 3D
 * (Phase 9) suivra la même règle et ne sera jamais atteinte depuis un tableau de bord.
 */
const auth = () => import('@/features/auth/auth-pages');
const LoginPage = lazy(() => auth().then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => auth().then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => auth().then((m) => ({ default: m.ResetPasswordPage })));
const ChangePasswordPage = lazy(() => auth().then((m) => ({ default: m.ChangePasswordPage })));
const PortalLayout = lazy(() => import('./layouts/portal-layout').then((m) => ({ default: m.PortalLayout })));
const DashboardPage = lazy(() =>
  import('@/features/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const RequestPage = lazy(() => import('@/features/request/request-page').then((m) => ({ default: m.RequestPage })));
const ProjectsPage = lazy(() => import('@/features/projects/projects-page').then((m) => ({ default: m.ProjectsPage })));
const DesignerPage = lazy(() => import('@/features/designer/designer-page').then((m) => ({ default: m.DesignerPage })));
const UsersPage = lazy(() => import('@/features/admin/users-page').then((m) => ({ default: m.UsersPage })));
const AdminRequestsPage = lazy(() => import('@/features/admin/requests-page').then((m) => ({ default: m.AdminRequestsPage })));
const CatalogPage = lazy(() => import('@/features/admin/catalog-page').then((m) => ({ default: m.CatalogPage })));
// `import.meta.env.DEV` est remplacé statiquement à la build : en production, Rollup élimine
// entièrement cet import dynamique — la page de référence des composants n'existe pas dans
// dist/, pas seulement hors des routes.
const DevUiPage = import.meta.env.DEV
  ? lazy(() => import('@/features/dev/dev-ui-page').then((m) => ({ default: m.DevUiPage })))
  : null;

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 p-6" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const publicPage = (element: ReactNode) => (
  <RedirectIfAuthenticated>
    <Lazy>{element}</Lazy>
  </RedirectIfAuthenticated>
);

/** Un portail par rôle, sous le chemin de ROLE_HOME ; le rôle est revérifié par le serveur. */
const portalRoute = (role: Role): RouteObject => ({
  path: ROLE_HOME[role],
  element: (
    <RequireRole role={role}>
      <Lazy>
        <PortalLayout role={role} />
      </Lazy>
    </RequireRole>
  ),
  children: [
    { index: true, element: <Lazy><DashboardPage role={role} /></Lazy> },
    ...(role === 'CLIENT'
      ? [{ path: 'request', element: <Lazy><RequestPage /></Lazy> }]
      : [
          { path: 'projects', element: <Lazy><ProjectsPage role={role} /></Lazy> },
          { path: 'projects/:id/design', element: <Lazy><DesignerPage /></Lazy> },
          ...(role === 'ADMIN'
            ? [
                { path: 'users', element: <Lazy><UsersPage /></Lazy> },
                { path: 'requests', element: <Lazy><AdminRequestsPage /></Lazy> },
                { path: 'catalog', element: <Lazy><CatalogPage /></Lazy> },
              ]
            : []),
        ]),
  ],
});

export const routes: RouteObject[] = [
  { path: '/login', element: publicPage(<LoginPage />) },
  { path: '/forgot-password', element: publicPage(<ForgotPasswordPage />) },
  { path: '/reset-password', element: publicPage(<ResetPasswordPage />) },
  // Page de référence des composants — développement uniquement, absente du bundle de production.
  ...(DevUiPage ? [{ path: '/dev/ui', element: <Lazy><DevUiPage /></Lazy> }] : []),
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <RoleHomeRedirect /> },
      { path: '/change-password', element: <Lazy><ChangePasswordPage /></Lazy> },
      ...ROLES.map(portalRoute),
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];

export const createRouter = () => createBrowserRouter(routes);
