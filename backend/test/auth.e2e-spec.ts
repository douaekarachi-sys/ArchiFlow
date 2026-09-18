import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, PASSWORD, type World } from './support/world';

let t: TestApp;
let w: World;
const server = () => request(t.app.getHttpServer());

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());
beforeEach(async () => {
  w = await buildWorld(t.prisma);
  t.mailer.outbox.length = 0;
});

describe('connexion — diagramme « API gestion des comptes », scénario 2', () => {
  it('[compte introuvable] et [mot de passe invalide] répondent à l’identique', async () => {
    const wrongPassword = await server().post(`${API}/auth/login`).send({ email: w.users.adminA.email, password: 'faux' });
    const unknownAccount = await server().post(`${API}/auth/login`).send({ email: 'personne@test.local', password: 'faux' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants incorrects' } });
    expect(unknownAccount.body).toEqual(wrongPassword.body);
  });

  it('un compte désactivé reçoit le même message qu’un compte inconnu', async () => {
    await t.prisma.system.user.update({ where: { id: w.users.salesA.id }, data: { deletedAt: new Date() } });
    const res = await server().post(`${API}/auth/login`).send({ email: w.users.salesA.email, password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('renvoie {token, profil, role} et redirige vers le portail du rôle', async () => {
    const res = await server().post(`${API}/auth/login`).send({ email: w.users.architectA.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.profile).toMatchObject({ role: 'ARCHITECT', organizationId: w.orgA, mustChangePassword: false });
    expect(res.body.profile).not.toHaveProperty('passwordHash');
    expect(res.body.redirectTo).toBe('/architect');
  });

  it('le jeton de rafraîchissement n’est QUE dans un cookie httpOnly, SameSite=Strict, limité à /api/v1/auth', async () => {
    const res = await server().post(`${API}/auth/login`).send({ email: w.users.adminA.email, password: PASSWORD });
    expect(JSON.stringify(res.body)).not.toMatch(/refresh/i);
    const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('af_rt='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/i);
  });

  it('ignore un rôle glissé dans le corps de la requête', async () => {
    const res = await server()
      .post(`${API}/auth/login`)
      .send({ email: w.users.clientA1.email, password: PASSWORD, role: 'ADMIN' });
    expect(res.body.profile.role).toBe('CLIENT');
  });

  it('journalise la connexion et l’échec de connexion', async () => {
    await server().post(`${API}/auth/login`).send({ email: w.users.adminA.email, password: 'faux' });
    await login(t, w.users.adminA.email);
    const actions = (await t.prisma.system.auditLog.findMany({ where: { actorId: w.users.adminA.id } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['auth.login.failed', 'auth.login']));
  });
});

describe('garde d’authentification', () => {
  it('refuse une requête sans jeton', async () => {
    const res = await server().get(`${API}/projects`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('refuse un jeton falsifié', async () => {
    const res = await server().get(`${API}/projects`).set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('un compte désactivé perd l’accès immédiatement, sans attendre l’expiration du jeton', async () => {
    const s = await login(t, w.users.engineerA.email);
    await t.prisma.system.user.update({ where: { id: w.users.engineerA.id }, data: { deletedAt: new Date() } });
    const res = await server().get(`${API}/projects`).set(s.auth);
    expect(res.status).toBe(401);
  });

  it('un rôle modifié s’applique immédiatement : la base fait foi, pas le jeton', async () => {
    const s = await login(t, w.users.pmA.email);
    expect((await server().get(`${API}/users`).set(s.auth)).status).toBe(200);
    await t.prisma.system.user.update({ where: { id: w.users.pmA.id }, data: { role: 'SALES' } });
    expect((await server().get(`${API}/users`).set(s.auth)).status).toBe(403);
  });
});

describe('rafraîchissement de session — rotation et détection de réutilisation', () => {
  it('échange le jeton contre un nouveau à chaque usage', async () => {
    const s = await login(t, w.users.adminA.email);
    const res = await server().post(`${API}/auth/refresh`).set('Cookie', s.cookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    const next = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('af_rt='));
    expect(next?.split(';')[0]).not.toBe(s.cookie);
  });

  it('la réutilisation d’un jeton déjà échangé révoque toute la famille', async () => {
    const s = await login(t, w.users.adminA.email);
    const first = await server().post(`${API}/auth/refresh`).set('Cookie', s.cookie);
    const rotated = ([] as string[]).concat(first.headers['set-cookie'] ?? []).find((c) => c.startsWith('af_rt='))!.split(';')[0]!;

    // Rejeu de l'ancien jeton : vol présumé.
    const replay = await server().post(`${API}/auth/refresh`).set('Cookie', s.cookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('SESSION_EXPIRED');

    // Le jeton légitime issu de la rotation tombe avec la famille.
    const legit = await server().post(`${API}/auth/refresh`).set('Cookie', rotated);
    expect(legit.status).toBe(401);

    const audit = await t.prisma.system.auditLog.findMany({ where: { action: 'auth.refresh.reuse_detected' } });
    expect(audit.length).toBeGreaterThan(0);
  });

  it('stocke une empreinte, jamais le jeton lui-même', async () => {
    const s = await login(t, w.users.adminA.email);
    const raw = decodeURIComponent(s.cookie.replace('af_rt=', ''));
    const rows = await t.prisma.system.refreshToken.findMany({ where: { userId: w.users.adminA.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toBe(raw);
    expect(rows[0]!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('la déconnexion révoque la session côté serveur', async () => {
    const s = await login(t, w.users.adminA.email);
    expect((await server().post(`${API}/auth/logout`).set('Cookie', s.cookie)).status).toBe(204);
    expect((await server().post(`${API}/auth/refresh`).set('Cookie', s.cookie)).status).toBe(401);
  });

  it('sans cookie, le rafraîchissement échoue proprement', async () => {
    const res = await server().post(`${API}/auth/refresh`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });
});

describe('mot de passe provisoire (ADR 0010)', () => {
  beforeEach(async () => {
    await t.prisma.system.user.update({ where: { id: w.users.clientA1.id }, data: { mustChangePassword: true } });
  });

  it('redirige vers le changement de mot de passe et bloque le reste de l’API', async () => {
    const res = await server().post(`${API}/auth/login`).send({ email: w.users.clientA1.email, password: PASSWORD });
    expect(res.body.redirectTo).toBe('/change-password');
    const s = { Authorization: `Bearer ${res.body.accessToken}` };

    const blocked = await server().get(`${API}/projects`).set(s);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await server().get(`${API}/auth/me`).set(s)).status).toBe(200);
  });

  it('le changement lève le blocage et invalide les jetons antérieurs', async () => {
    const s = await login(t, w.users.clientA1.email);
    const res = await server()
      .patch(`${API}/auth/password`)
      .set(s.auth)
      .send({ currentPassword: PASSWORD, newPassword: 'un-nouveau-mot-de-passe' });
    expect(res.status).toBe(200);
    expect(res.body.profile.mustChangePassword).toBe(false);
    expect(res.body.redirectTo).toBe('/client');

    const fresh = { Authorization: `Bearer ${res.body.accessToken}` };
    expect((await server().get(`${API}/projects`).set(fresh)).status).toBe(200);
    // L'ancienne session de rafraîchissement ne vaut plus rien.
    expect((await server().post(`${API}/auth/refresh`).set('Cookie', s.cookie)).status).toBe(401);
  });

  it('refuse un mot de passe actuel erroné', async () => {
    const s = await login(t, w.users.clientA1.email);
    const res = await server()
      .patch(`${API}/auth/password`)
      .set(s.auth)
      .send({ currentPassword: 'mauvais-mot-de-passe', newPassword: 'un-nouveau-mot-de-passe' });
    expect(res.status).toBe(400);
  });
});

describe('mot de passe oublié', () => {
  it('répond à l’identique pour une adresse connue et une adresse inconnue', async () => {
    const known = await server().post(`${API}/auth/forgot`).send({ email: w.users.engineerA.email });
    const unknown = await server().post(`${API}/auth/forgot`).send({ email: 'inconnu@test.local' });
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    expect(t.mailer.outbox).toHaveLength(1);
  });

  it('réinitialise avec le lien reçu, une seule fois', async () => {
    await server().post(`${API}/auth/forgot`).send({ email: w.users.engineerA.email });
    const token = /token=([A-Za-z0-9_-]+)/.exec(t.mailer.outbox[0]!.text)![1]!;

    const reset = await server().post(`${API}/auth/reset`).send({ token, newPassword: 'mot-de-passe-reinitialise' });
    expect(reset.status).toBe(204);
    await login(t, w.users.engineerA.email, 'mot-de-passe-reinitialise');

    const again = await server().post(`${API}/auth/reset`).send({ token, newPassword: 'encore-un-autre-mot-de-passe' });
    expect(again.status).toBe(422);
  });
});

describe('limitation de débit sur /auth', () => {
  it('répond 429 au-delà du seuil de tentatives', async () => {
    const limited = await createTestApp({ THROTTLE_AUTH_LIMIT: '3' });
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await request(limited.app.getHttpServer())
          .post(`${API}/auth/login`)
          .send({ email: 'x@test.local', password: 'faux' });
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
      expect(statuses[4]).toBe(429);
    } finally {
      await limited.close();
    }
  });
});
