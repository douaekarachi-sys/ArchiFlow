import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/auth/session-store';
import { projectsApi } from '@/api/endpoints';
import { RequestPage } from './request-page';

vi.mock('@/api/endpoints', () => ({
  projectsApi: {
    create: vi.fn(),
  },
}));

const setClientSession = () =>
  useSession.setState({
    status: 'authenticated',
    accessToken: 'token',
    profile: {
      id: '11111111-1111-1111-1111-111111111111',
      firstName: 'Alice',
      lastName: 'Client',
      email: 'client@archiflow.local',
      role: 'CLIENT',
      organizationId: '22222222-2222-2222-2222-222222222222',
      clientCompanyId: '33333333-3333-3333-3333-333333333333',
      mustChangePassword: false,
    },
  });

describe('RequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.setState({ status: 'anonymous', accessToken: null, profile: null });
  });

  it('crée un projet client avec une description simple', async () => {
    setClientSession();
    vi.mocked(projectsApi.create).mockResolvedValue({
      id: 'p-123',
      name: 'Nouveau siège Rabat',
      description: 'Rabat\n\nLe besoin est le suivant : je veux du Wi-Fi pour 200 employés',
      status: 'DRAFT',
      clientCompanyId: '33333333-3333-3333-3333-333333333333',
      clientCompany: { id: '33333333-3333-3333-3333-333333333333', name: 'Client A' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <RequestPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText('Nom du projet'), 'Nouveau siège Rabat');
    await userEvent.type(screen.getByLabelText('Localisation'), 'Rabat');
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un bâtiment' }));
    await userEvent.type(screen.getByLabelText('Nom du bâtiment'), 'Bâtiment A');
    await userEvent.type(screen.getByLabelText('Surface (m²)'), '500');
    await userEvent.type(screen.getByLabelText('Étages'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un département' }));
    await userEvent.type(screen.getByLabelText('Nom du département'), 'IT');
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    await userEvent.type(screen.getByLabelText('Employés'), '200');
    await userEvent.type(screen.getByLabelText('Expression libre du besoin'), 'Le besoin est le suivant : je veux du Wi-Fi pour 200 employés');
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await userEvent.click(screen.getByLabelText('Wi-Fi'));

    await userEvent.click(screen.getByRole('button', { name: 'Créer le projet' }));

    await waitFor(() => {
      expect(projectsApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Nouveau siège Rabat',
        description: '',
        location: 'Rabat',
        totalEmployees: 200,
        freeTextNeed: 'Le besoin est le suivant : je veux du Wi-Fi pour 200 employés',
        wifi: true,
        clientCompanyId: '33333333-3333-3333-3333-333333333333',
        buildings: [{ name: 'Bâtiment A', areaM2: 500, floors: 3, description: null }],
        departments: [{ name: 'IT', employees: null, workstations: null, location: null, notes: null }],
      }));
    });

    expect(await screen.findByText('Projet créé')).toBeInTheDocument();
  });
});
