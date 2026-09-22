import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { architectureApi, projectsApi } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { VersionsDetailPage } from './versions-page';

vi.mock('@/api/endpoints', () => ({
  architectureApi: { versions: vi.fn(), diff: vi.fn(), restore: vi.fn() },
  projectsApi: { get: vi.fn() },
}));

function setSession(role: 'ARCHITECT' | 'ENGINEER') {
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
      clientCompanyId: null,
      mustChangePassword: false,
    },
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/architect/projects/proj-1/versions']}>
        <Routes>
          <Route path="/architect/projects/:id/versions" element={<VersionsDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const VERSIONS = [
  { number: 2, comment: null, restoredFromVersion: null, createdAt: '2026-09-20T10:00:00.000Z', author: { id: 'u1', firstName: 'Karim', lastName: 'Idrissi' } },
  { number: 1, comment: null, restoredFromVersion: null, createdAt: '2026-09-18T10:00:00.000Z', author: { id: 'u1', firstName: 'Karim', lastName: 'Idrissi' } },
];

describe('VersionsDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.setState({ status: 'anonymous', accessToken: null, profile: null });
  });

  it('affiche le diff sémantique entre deux versions (EF-405) et permet de restaurer (ARCHITECT)', async () => {
    setSession('ARCHITECT');
    vi.mocked(projectsApi.get).mockResolvedValue({
      id: 'proj-1', name: 'Nouveau siège Rabat', description: null, status: 'ARCHITECTURE', dueDate: null,
      clientCompanyId: 'c1', clientCompany: { id: 'c1', name: 'Atlas' }, createdAt: '', updatedAt: '',
      assignments: [], shares: [], request: null,
    });
    vi.mocked(architectureApi.versions).mockResolvedValue(VERSIONS);
    vi.mocked(architectureApi.diff).mockResolvedValue({
      elements: [
        { category: 'switch', added: 2, removed: 0, changed: 0 },
        { category: 'firewall', added: 0, removed: 1, changed: 0 },
      ],
      connectionsAdded: 0,
      connectionsRemoved: 0,
      zonesAdded: 0,
      zonesRemoved: 0,
    });
    vi.mocked(architectureApi.restore).mockResolvedValue({ elements: [], connections: [], zones: [] });

    renderPage();

    expect(await screen.findByText('Commutateur')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('−1')).toBeInTheDocument();

    const restoreButtons = screen.getAllByRole('button', { name: 'Restaurer' });
    await userEvent.click(restoreButtons[0]!);
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restaurer' }));

    expect(architectureApi.restore).toHaveBeenCalledWith('proj-1', 2);
  });

  it("n'affiche pas le bouton restaurer pour un rôle sans architecture.edit (ENGINEER)", async () => {
    setSession('ENGINEER');
    vi.mocked(projectsApi.get).mockResolvedValue({
      id: 'proj-1', name: 'Nouveau siège Rabat', description: null, status: 'ARCHITECTURE', dueDate: null,
      clientCompanyId: 'c1', clientCompany: { id: 'c1', name: 'Atlas' }, createdAt: '', updatedAt: '',
      assignments: [], shares: [], request: null,
    });
    vi.mocked(architectureApi.versions).mockResolvedValue(VERSIONS);
    vi.mocked(architectureApi.diff).mockResolvedValue({ elements: [], connectionsAdded: 0, connectionsRemoved: 0, zonesAdded: 0, zonesRemoved: 0 });

    renderPage();

    expect(await screen.findByText('Aucune différence entre ces deux versions.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restaurer' })).not.toBeInTheDocument();
  });
});
