import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { bomApi, projectsApi } from '@/api/endpoints';
import { BomDetailPage } from './bom-page';

vi.mock('@/api/endpoints', () => ({
  bomApi: { get: vi.fn() },
  projectsApi: { get: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/sales/projects/proj-1/bom']}>
        <Routes>
          <Route path="/sales/projects/:id/bom" element={<BomDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BomDetailPage', () => {
  it('affiche la nomenclature et les coûts dérivés, matériel et licence distincts (EF-302, EF-303)', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({
      id: 'proj-1', name: 'Nouveau siège Rabat', description: null, status: 'COMMERCIAL_REVIEW', dueDate: null,
      clientCompanyId: 'c1', clientCompany: { id: 'c1', name: 'Atlas' }, createdAt: '', updatedAt: '',
      assignments: [], shares: [], request: null,
    });
    vi.mocked(bomApi.get).mockResolvedValue({
      lines: [
        {
          equipmentModelId: 'model-fw', name: 'FortiGate 60F', reference: 'FG-60F', category: 'firewall',
          quantity: 1, unitPrice: 21000, currency: 'MAD', licenseAnnualCost: 4500, subtotal: 21000, licenseSubtotal: 4500,
        },
      ],
      unpricedElementCount: 1,
      materialTotal: 21000,
      licenseTotal: 4500,
      currency: 'MAD',
      grandTotal: 25500,
    });

    renderPage();

    expect(await screen.findByText('FortiGate 60F')).toBeInTheDocument();
    expect(screen.getByText('1 élément sans prix ou sans modèle catalogue, exclu du total.')).toBeInTheDocument();
    expect(screen.getByText('Non estimée')).toBeInTheDocument(); // mise en œuvre, jamais inventée
  });
});
