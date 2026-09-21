import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { architectureApi } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { Designer3DPage } from './designer-3d-page';

vi.mock('@/api/endpoints', () => ({
  architectureApi: { get: vi.fn() },
}));

// Le Canvas React Three Fiber exige un contexte WebGL, absent de jsdom : ces tests couvrent les
// états qui ne l'atteignent jamais (chargement, erreur, plan vide) — le rendu 3D lui-même n'est
// pas testable sans navigateur réel, comme tout composant R3F.
function renderPage() {
  useSession.setState({
    status: 'authenticated',
    accessToken: 'token',
    profile: {
      id: 'u1', firstName: 'Test', lastName: 'User', email: 'test@archiflow.local',
      role: 'ARCHITECT', organizationId: 'org1', clientCompanyId: null, mustChangePassword: false,
    },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/architect/projects/proj-1/3d']}>
        <Routes>
          <Route path="/architect/projects/:id/3d" element={<Designer3DPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Designer3DPage (EF-104)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.setState({ status: 'anonymous', accessToken: null, profile: null });
  });

  it('affiche un état vide honnête quand le plan ne contient aucun équipement', async () => {
    vi.mocked(architectureApi.get).mockResolvedValue({ elements: [], connections: [], zones: [] });
    renderPage();
    expect(await screen.findByText('Le plan est vide')).toBeInTheDocument();
  });

  it("affiche l'état d'erreur si le document ne charge pas", async () => {
    const { ApiError } = await import('@/api/client');
    vi.mocked(architectureApi.get).mockRejectedValue(new ApiError(500, 'INTERNAL', 'Erreur interne'));
    renderPage();
    expect(await screen.findByText('Une erreur inattendue s\'est produite. Réessayez dans un instant.')).toBeInTheDocument();
  });
});
