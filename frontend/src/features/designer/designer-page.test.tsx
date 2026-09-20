import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { architectureApi, catalogApi } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { DesignerPage } from './designer-page';

vi.mock('@/api/endpoints', () => ({
  architectureApi: { get: vi.fn(), save: vi.fn() },
  catalogApi: { equipment: vi.fn() },
}));

function setArchitectSession() {
  useSession.setState({
    status: 'authenticated',
    accessToken: 'token',
    profile: {
      id: '11111111-1111-1111-1111-111111111111',
      firstName: 'Alex',
      lastName: 'Architecte',
      email: 'architecte@archiflow.local',
      role: 'ARCHITECT',
      organizationId: '22222222-2222-2222-2222-222222222222',
      clientCompanyId: null,
      mustChangePassword: false,
    },
  });
}

function renderDesigner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/architect/projects/proj-1/design']}>
        <Routes>
          <Route path="/architect/projects/:id/design" element={<DesignerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DesignerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.setState({ status: 'anonymous', accessToken: null, profile: null });
    vi.stubGlobal('matchMedia', (query: string) =>
      ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList,
    );
    vi.mocked(catalogApi.equipment).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 500 });
  });

  it('charge un plan vide, permet de créer une zone, puis enregistre le document mis à jour', async () => {
    setArchitectSession();
    vi.mocked(architectureApi.get).mockResolvedValue({ elements: [], connections: [], zones: [] });
    vi.mocked(architectureApi.save).mockImplementation(async (_id, doc) => doc);

    renderDesigner();

    expect(await screen.findByText("Concepteur d'architecture")).toBeInTheDocument();
    expect(screen.getByText('Le plan est vide')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });
    expect(saveButton).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une zone' }));

    await waitFor(() => expect(saveButton).toBeEnabled());
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(architectureApi.save).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({ zones: [expect.objectContaining({ type: 'LAN', elementIds: [] })] }),
      );
    });
  });

  it('un rôle sans architecture.edit voit le plan en lecture seule, sans palette ni bouton d’enregistrement', async () => {
    useSession.setState({
      status: 'authenticated',
      accessToken: 'token',
      profile: {
        id: '33333333-3333-3333-3333-333333333333',
        firstName: 'Ines',
        lastName: 'Ingenieure',
        email: 'engineer@archiflow.local',
        role: 'ENGINEER',
        organizationId: '22222222-2222-2222-2222-222222222222',
        clientCompanyId: null,
        mustChangePassword: false,
      },
    });
    vi.mocked(architectureApi.get).mockResolvedValue({ elements: [], connections: [], zones: [] });

    renderDesigner();

    expect(await screen.findByText("Lecture seule : vous n'avez pas les droits de modification")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter une zone' })).not.toBeInTheDocument();
  });

  it('affiche les zones logiques sous forme de cadres visibles sur le canvas', async () => {
    setArchitectSession();
    vi.mocked(architectureApi.get).mockResolvedValue({
      elements: [
        {
          id: 'fw-1',
          type: 'firewall',
          equipmentModelId: null,
          label: 'Firewall DMZ',
          position: { x: 220, y: 180 },
          config: {},
        },
        {
          id: 'srv-1',
          type: 'server',
          equipmentModelId: null,
          label: 'Serveur interne',
          position: { x: 410, y: 320 },
          config: {},
        },
      ],
      connections: [],
      zones: [{ id: 'zone-dmz', type: 'DMZ', label: 'DMZ', elementIds: ['fw-1'] }],
    });

    renderDesigner();

    expect((await screen.findAllByText('DMZ')).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('DMZ').length).toBeGreaterThan(0);
  });

  it('valide la capacité en direct (EF-202) et affiche une anomalie CRITICAL avec les chiffres concrets', async () => {
    setArchitectSession();
    vi.mocked(catalogApi.equipment).mockResolvedValue({
      data: [
        {
          id: 'model-sw',
          name: 'Switch 1 port',
          reference: 'SW-1',
          description: null,
          portCount: 1,
          portType: 'RJ45',
          throughputMbps: 1000,
          poeBudgetW: null,
          powerDrawW: null,
          rackUnits: null,
          indicativePrice: null,
          currency: null,
          licenseInfo: null,
          availability: null,
          imageUrl: null,
          isDemoData: true,
          archivedAt: null,
          brand: { id: 'b1', name: 'Marque', manufacturer: { id: 'm1', name: 'Fabricant' } },
          category: { id: 'c1', code: 'switch', labelKey: 'equipment.category.switch' },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 500,
    });
    vi.mocked(architectureApi.get).mockResolvedValue({
      elements: [
        { id: 'sw', type: 'switch', equipmentModelId: 'model-sw', label: 'Switch', position: { x: 0, y: 0 }, config: {} },
        { id: 'a', type: 'server', equipmentModelId: null, label: 'Serveur A', position: { x: 100, y: 0 }, config: {} },
        { id: 'b', type: 'server', equipmentModelId: null, label: 'Serveur B', position: { x: 200, y: 0 }, config: {} },
      ],
      connections: [
        { id: 'l1', from: 'sw', to: 'a', linkType: 'copper' },
        { id: 'l2', from: 'sw', to: 'b', linkType: 'copper' },
      ],
      zones: [],
    });

    renderDesigner();

    expect(await screen.findByText('Incompatible')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL 1')).toBeInTheDocument();
    expect(screen.getByText('2 connexions pour 1 ports disponibles : capacité dépassée.')).toBeInTheDocument();
  });
});
