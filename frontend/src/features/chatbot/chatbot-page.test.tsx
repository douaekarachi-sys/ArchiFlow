import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { chatbotApi, projectsApi } from '@/api/endpoints';
import { ChatbotPage } from './chatbot-page';

vi.mock('@/api/endpoints', () => ({
  chatbotApi: { ask: vi.fn(), escalate: vi.fn() },
  projectsApi: { list: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChatbotPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChatbotPage (T9)', () => {
  it('envoie une question et affiche la réponse avec le détail du calcul (repli local)', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: 'proj-1', name: 'Nouveau siège Rabat', description: null, status: 'CLIENT_REVIEW', clientCompanyId: 'c1', clientCompany: { id: 'c1', name: 'Atlas' }, createdAt: '', updatedAt: '' }],
      total: 1,
      page: 1,
      pageSize: 1,
    });
    vi.mocked(chatbotApi.ask).mockResolvedValue({
      key: 'chatbot.sizingPorts',
      params: { count: 100 },
      steps: [{ key: 'sizing.ports.formula', params: { workstations: 100, growthPercent: 20, totalPorts: 120, switchCount: 3, switchCapacity: 48 } }],
      shouldEscalate: false,
    });

    renderPage();

    const input = await screen.findByPlaceholderText("Ex. « 200 employés, combien de switches ? »");
    await userEvent.type(input, '100 employés, combien de switches ?');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(await screen.findByText('100 employés, combien de switches ?')).toBeInTheDocument();
    expect(chatbotApi.ask).toHaveBeenCalledWith('proj-1', '100 employés, combien de switches ?');
    expect(await screen.findByText('100 postes + 20% de croissance = 120 ports → 3 switches 48 ports')).toBeInTheDocument();
  });

  it('propose de transmettre à l’équipe technique quand le repli local ne sait pas répondre', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: 'proj-1', name: 'Nouveau siège Rabat', description: null, status: 'CLIENT_REVIEW', clientCompanyId: 'c1', clientCompany: { id: 'c1', name: 'Atlas' }, createdAt: '', updatedAt: '' }],
      total: 1,
      page: 1,
      pageSize: 1,
    });
    vi.mocked(chatbotApi.ask).mockResolvedValue({ key: 'chatbot.fallback', steps: [], shouldEscalate: true });
    vi.mocked(chatbotApi.escalate).mockResolvedValue({ escalated: true });

    renderPage();

    const input = await screen.findByPlaceholderText("Ex. « 200 employés, combien de switches ? »");
    await userEvent.type(input, 'Quel jour sommes-nous ?');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    const escalateButton = await screen.findByRole('button', { name: "Transmettre à l'équipe technique" });
    await userEvent.click(escalateButton);

    expect(chatbotApi.escalate).toHaveBeenCalledWith('proj-1', 'Quel jour sommes-nous ?');
    expect(await screen.findByText("Transmis à l'équipe technique. Elle reviendra vers vous.")).toBeInTheDocument();
  });
});
