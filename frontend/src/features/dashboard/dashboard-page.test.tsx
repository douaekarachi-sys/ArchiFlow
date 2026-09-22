import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectSummary } from '@/api/endpoints';
import { projectsApi, usersApi } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { DashboardPage } from './dashboard-page';

vi.mock('@/api/endpoints', () => ({
  projectsApi: { list: vi.fn(), transitions: vi.fn() },
  usersApi: { count: vi.fn() },
}));

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'p1',
    name: 'Nouveau siège Rabat',
    description: null,
    status: 'ENGINEERING',
    dueDate: null,
    clientCompanyId: 'c1',
    clientCompany: { id: 'c1', name: 'Groupe Atlas Services' },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...overrides,
  };
}

function setSession(role: 'ADMIN' | 'CLIENT') {
  useSession.setState({
    status: 'authenticated',
    accessToken: 'token',
    profile: {
      id: 'u1',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@archiflow.local',
      role,
      organizationId: 'org1',
      clientCompanyId: role === 'CLIENT' ? 'c1' : null,
      mustChangePassword: false,
    },
  });
}

function renderDashboard(role: 'ADMIN' | 'CLIENT') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage role={role} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.setState({ status: 'anonymous', accessToken: null, profile: null });
  });

  it('portail interne (ADMIN) : répartition par statut, métriques et liste avec la colonne Client', async () => {
    setSession('ADMIN');
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [project({ id: 'p1', status: 'ENGINEERING' }), project({ id: 'p2', status: 'COMPLETED', name: 'Data center Casablanca' })],
      total: 2,
      page: 1,
      pageSize: 100,
    });
    vi.mocked(usersApi.count).mockResolvedValue({ data: [], total: 6, page: 1, pageSize: 1 });

    renderDashboard('ADMIN');

    expect((await screen.findAllByText('Groupe Atlas Services')).length).toBeGreaterThan(0); // colonne Client, ADMIN
    expect(screen.getByText('Utilisateurs actifs')).toBeInTheDocument(); // MultiColumnStat réel (usersApi.count)
    expect(screen.getByText('Projets sans mise à jour récente')).toBeInTheDocument();
  });

  it("portail client : son projet, sa progression réelle, aucune colonne société ni statut interne", async () => {
    setSession('CLIENT');
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [project({ id: 'p1', status: 'CLIENT_REVIEW', name: 'Banque régionale Oujda' })],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    vi.mocked(projectsApi.transitions).mockResolvedValue([{ to: 'CLIENT_APPROVED', labelKey: 'workflow.approve', requiresReason: false }]);

    renderDashboard('CLIENT');

    expect(await screen.findByRole('heading', { name: 'Banque régionale Oujda' })).toBeInTheDocument();
    // La prochaine action réelle (transition serveur, chargée après le projet), pas le texte générique de repli.
    expect(await screen.findByText("Valider l'architecture")).toBeInTheDocument();
    // Jamais le statut interne brut, ni le nom de sa propre société en colonne.
    expect(screen.queryByText('CLIENT_REVIEW')).not.toBeInTheDocument();
    expect(screen.queryByText('Groupe Atlas Services')).not.toBeInTheDocument();
    // L'étape traduite en langage client, elle, est bien affichée dans la liste.
    const list = screen.getByRole('heading', { name: 'Mes projets', level: 2 }).closest('section')!;
    expect(within(list).getByText('Validation')).toBeInTheDocument();
  });

  it("portail client sans projet : état honnête, jamais d'appel de transition inventé", async () => {
    setSession('CLIENT');
    vi.mocked(projectsApi.list).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 100 });

    renderDashboard('CLIENT');

    expect(await screen.findByText('Aucun projet pour le moment')).toBeInTheDocument();
    expect(projectsApi.transitions).not.toHaveBeenCalled();
  });
});
