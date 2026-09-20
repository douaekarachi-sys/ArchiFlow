import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectsApi } from '@/api/endpoints';
import { SizingDetailPage } from './sizing-page';

vi.mock('@/api/endpoints', () => ({
  projectsApi: { get: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/engineer/projects/proj-1/sizing']}>
        <Routes>
          <Route path="/engineer/projects/:id/sizing" element={<SizingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SizingDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calcule et affiche le dimensionnement avec le détail du calcul (EF-202)', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({
      id: 'proj-1',
      name: 'Nouveau siège Rabat',
      description: null,
      status: 'ENGINEERING',
      clientCompanyId: 'c1',
      clientCompany: { id: 'c1', name: 'Groupe Atlas Services' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      assignments: [],
      request: {
        location: null,
        projectType: null,
        siteCount: null,
        totalEmployees: 580,
        workstationCount: 580,
        concurrentUsers: null,
        serverCount: 4,
        wifi: true,
        wifiApCount: null,
        voip: null,
        vpn: null,
        firewall: null,
        vlan: null,
        segmentation: null,
        vendors: [],
        freeTextNeed: null,
        networkNotes: null,
        securityNotes: null,
        serverNotes: null,
        buildings: [],
        departments: [],
      },
    });

    renderPage();

    expect(await screen.findByText('580 postes + 20% de croissance = 696 ports → 15 switches 48 ports')).toBeInTheDocument();
    expect(screen.getByText('580 postes × 10 Mb/s recommandés = 5800 Mb/s de bande passante agrégée')).toBeInTheDocument();
    expect(screen.getByText("580 utilisateurs ÷ 25 par point d'accès = 24 points d'accès (arrondi supérieur)")).toBeInTheDocument();
    expect(screen.getByText('4 serveurs × 500 W = 2000 W')).toBeInTheDocument();
  });

  it("affiche un état honnête quand le projet n'a pas de besoin exprimé", async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({
      id: 'proj-1',
      name: 'Sans besoin',
      description: null,
      status: 'DRAFT',
      clientCompanyId: 'c1',
      clientCompany: { id: 'c1', name: 'Groupe Atlas Services' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      assignments: [],
      request: null,
    });

    renderPage();

    expect(await screen.findByText("Aucune demande détaillée n'est encore associée à ce projet.")).toBeInTheDocument();
  });
});
