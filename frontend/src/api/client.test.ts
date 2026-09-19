import type { AuthResult } from '@archiflow/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/auth/session-store';
import { ApiError, apiRequest, refreshSession } from './client';

const profile: AuthResult['profile'] = {
  id: '11111111-1111-1111-1111-111111111111',
  firstName: 'Salma',
  lastName: 'Tazi',
  email: 'salma@test.ma',
  role: 'ENGINEER',
  organizationId: '22222222-2222-2222-2222-222222222222',
  clientCompanyId: null,
  mustChangePassword: false,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  useSession.setState({ status: 'authenticated', accessToken: 'ancien', profile });
});
afterEach(() => vi.unstubAllGlobals());

describe('client HTTP', () => {
  it('envoie le jeton d’accès et les cookies', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await apiRequest('/projects');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer ancien');
    expect(init.credentials).toBe('include');
  });

  it('sur 401 de session, rafraîchit UNE fois puis rejoue la requête', async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'neuf', profile, redirectTo: '/engineer' });
      const auth = (init.headers as Record<string, string>)['Authorization'];
      return auth === 'Bearer neuf' ? json(200, { ok: true }) : json(401, { error: { code: 'SESSION_EXPIRED' } });
    });

    // Trois appels concurrents qui échouent ensemble : une seule requête de rafraîchissement.
    const results = await Promise.all([apiRequest('/a'), apiRequest('/b'), apiRequest('/c')]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(useSession.getState().accessToken).toBe('neuf');
  });

  it('si le rafraîchissement échoue, la session locale est effacée', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/refresh') ? json(401, { error: { code: 'SESSION_EXPIRED' } }) : json(401, { error: { code: 'UNAUTHENTICATED' } }),
    );
    await expect(apiRequest('/projects')).rejects.toBeInstanceOf(ApiError);
    expect(useSession.getState()).toMatchObject({ status: 'anonymous', accessToken: null, profile: null });
  });

  it('ne tente aucun rafraîchissement sur une erreur d’identifiants', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants incorrects' } }));
    await expect(apiRequest('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('normalise une panne réseau en erreur NETWORK', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiRequest('/projects')).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
  });

  it('le jeton de rafraîchissement n’est jamais manipulé par le JavaScript', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'neuf', profile, redirectTo: '/engineer' }));
    await refreshSession();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/auth\/refresh$/);
    expect(init.body).toBeUndefined();
    expect(JSON.stringify(useSession.getState())).not.toMatch(/refresh/i);
  });
});
