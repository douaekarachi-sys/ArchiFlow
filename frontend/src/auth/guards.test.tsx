import type { Role, UserProfile } from '@archiflow/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RequireAuth, RequireRole } from './guards';
import { useSession } from './session-store';

const profile = (role: Role, mustChangePassword = false): UserProfile => ({
  id: '11111111-1111-1111-1111-111111111111',
  firstName: 'A',
  lastName: 'B',
  email: 'a@b.ma',
  role,
  organizationId: '22222222-2222-2222-2222-222222222222',
  clientCompanyId: role === 'CLIENT' ? '33333333-3333-3333-3333-333333333333' : null,
  mustChangePassword,
});

function renderAt(path: string) {
  // MemoryRouter (et non un routeur de données) : jsdom et Node ne partagent pas le même AbortSignal.
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>page-login</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/change-password" element={<p>page-change-password</p>} />
          <Route path="/admin" element={<RequireRole role="ADMIN"><p>portail-admin</p></RequireRole>} />
          <Route path="/engineer" element={<RequireRole role="ENGINEER"><p>portail-ingenieur</p></RequireRole>} />
          <Route path="/client" element={<RequireRole role="CLIENT"><p>portail-client</p></RequireRole>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => useSession.setState({ status: 'anonymous', accessToken: null, profile: null }));

describe('gardes de navigation', () => {
  it('un visiteur non connecté est envoyé à la connexion', () => {
    renderAt('/admin');
    expect(screen.getByText('page-login')).toBeInTheDocument();
  });

  it('chaque rôle accède à son portail', () => {
    useSession.setState({ status: 'authenticated', accessToken: 't', profile: profile('ENGINEER') });
    renderAt('/engineer');
    expect(screen.getByText('portail-ingenieur')).toBeInTheDocument();
  });

  it('un rôle qui tente un autre portail est ramené au sien', () => {
    useSession.setState({ status: 'authenticated', accessToken: 't', profile: profile('CLIENT') });
    renderAt('/admin');
    expect(screen.getByText('portail-client')).toBeInTheDocument();
    expect(screen.queryByText('portail-admin')).toBeNull();
  });

  it('un mot de passe provisoire impose d’abord le changement', () => {
    useSession.setState({ status: 'authenticated', accessToken: 't', profile: profile('CLIENT', true) });
    renderAt('/client');
    expect(screen.getByText('page-change-password')).toBeInTheDocument();
  });
});
