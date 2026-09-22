import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, PASSWORD, type Session, type World } from './support/world';

let t: TestApp;
let w: World;
let admin: Session;
const server = () => request(t.app.getHttpServer());

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());
beforeEach(async () => {
  w = await buildWorld(t.prisma);
  admin = await login(t, w.users.adminA.email);
});

const newClient = (overrides: Record<string, unknown> = {}) => ({
  firstName: 'Leila',
  lastName: 'Amrani',
  email: 'leila.amrani@client.ma',
  temporaryPassword: 'provisoire-2026-!',
  role: 'CLIENT',
  clientCompanyId: w.companyA1,
  ...overrides,
});

describe('création de compte — scénario 1 (ADR 0010)', () => {
  it('crée un compte CLIENT rattaché à sa société, mot de passe provisoire à changer', async () => {
    const res = await server().post(`${API}/users`).set(admin.auth).send(newClient());
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'accepted' });

    const user = await t.prisma.system.user.findUniqueOrThrow({ where: { email: 'leila.amrani@client.ma' } });
    expect(user).toMatchObject({ role: 'CLIENT', clientCompanyId: w.companyA1, organizationId: w.orgA, mustChangePassword: true });
    expect(user.passwordHash).not.toContain('provisoire');

    const first = await server().post(`${API}/auth/login`).send({ email: user.email, password: 'provisoire-2026-!' });
    expect(first.body.redirectTo).toBe('/change-password');
  });

  it('[email déjà utilisé] : réponse IDENTIQUE, aucun compte créé', async () => {
    const fresh = await server().post(`${API}/users`).set(admin.auth).send(newClient());
    const duplicate = await server()
      .post(`${API}/users`)
      .set(admin.auth)
      .send(newClient({ firstName: 'Autre', temporaryPassword: 'autre-mot-de-passe' }));

    expect(duplicate.status).toBe(fresh.status);
    expect(duplicate.body).toEqual(fresh.body);
    expect(await t.prisma.system.user.count({ where: { email: 'leila.amrani@client.ma' } })).toBe(1);
    const untouched = await t.prisma.system.user.findUniqueOrThrow({ where: { email: 'leila.amrani@client.ma' } });
    expect(untouched.firstName).toBe('Leila');
  });

  it('ne révèle pas l’existence d’un compte d’un AUTRE locataire', async () => {
    const res = await server()
      .post(`${API}/users`)
      .set(admin.auth)
      .send(newClient({ email: w.users.adminB.email }));
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'accepted' });
    const adminB = await t.prisma.system.user.findUniqueOrThrow({ where: { email: w.users.adminB.email } });
    expect(adminB.organizationId).toBe(w.orgB);
  });

  it('trace la collision dans l’audit, sans l’adresse', async () => {
    await server().post(`${API}/users`).set(admin.auth).send(newClient({ email: w.users.salesA.email }));
    const entry = await t.prisma.system.auditLog.findFirstOrThrow({ where: { action: 'user.create.email_unavailable' } });
    expect(JSON.stringify(entry)).not.toContain(w.users.salesA.email);
  });

  it('refuse un compte CLIENT sans société, ou une société d’un autre locataire', async () => {
    const noCompany = await server().post(`${API}/users`).set(admin.auth).send(newClient({ clientCompanyId: undefined }));
    expect(noCompany.status).toBe(400);
    const foreign = await server().post(`${API}/users`).set(admin.auth).send(newClient({ clientCompanyId: w.companyB1 }));
    expect(foreign.status).toBe(404);
  });

  it('refuse le rôle « invite », qui n’existe pas', async () => {
    const res = await server().post(`${API}/users`).set(admin.auth).send(newClient({ role: 'invite' }));
    expect(res.status).toBe(400);
  });

  it('seul l’administrateur crée des comptes : « Permissions insuffisantes »', async () => {
    const pm = await login(t, w.users.pmA.email);
    const res = await server().post(`${API}/users`).set(pm.auth).send(newClient());
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Permissions insuffisantes');
  });

  it('il n’existe aucune route d’inscription publique', async () => {
    const res = await server().post(`${API}/auth/register`).send(newClient());
    expect(res.status).toBe(404);
  });
});

describe('changement de rôle — scénario 3', () => {
  it('[autorisé] : l’administrateur change le rôle d’un utilisateur interne', async () => {
    const res = await server().patch(`${API}/users/${w.users.salesA.id}/role`).set(admin.auth).send({ role: 'ENGINEER' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ENGINEER');
    const entry = await t.prisma.system.auditLog.findFirstOrThrow({ where: { action: 'user.role.changed' } });
    expect(entry.details).toEqual({ from: 'SALES', to: 'ENGINEER' });
  });

  it('[non autorisé] : « Permissions insuffisantes » pour tout autre rôle', async () => {
    for (const key of ['pmA', 'engineerA', 'architectA', 'salesA', 'clientA1'] as const) {
      const s = await login(t, w.users[key].email);
      const res = await server().patch(`${API}/users/${w.users.salesA.id}/role`).set(s.auth).send({ role: 'ADMIN' });
      expect(res.status, key).toBe(403);
      expect(res.body.error.message).toBe('Permissions insuffisantes');
    }
  });

  it('l’administrateur ne modifie pas son propre rôle', async () => {
    const res = await server().patch(`${API}/users/${w.users.adminA.id}/role`).set(admin.auth).send({ role: 'SALES' });
    expect(res.status).toBe(409);
  });

  it('un compte ne passe pas de client à interne', async () => {
    const res = await server().patch(`${API}/users/${w.users.clientA1.id}/role`).set(admin.auth).send({ role: 'ADMIN' });
    expect(res.status).toBe(422);
  });
});

describe('modification par l’administrateur (T15) — identité, rattachement à une société, mot de passe', () => {
  it('modifie le prénom et le nom', async () => {
    const res = await server().patch(`${API}/users/${w.users.salesA.id}`).set(admin.auth).send({ firstName: 'Nadia', lastName: 'Chraibi-Idrissi' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ firstName: 'Nadia', lastName: 'Chraibi-Idrissi' });
  });

  it('rattache un CLIENT à une autre société de la même organisation', async () => {
    const res = await server().patch(`${API}/users/${w.users.clientA1.id}`).set(admin.auth).send({ clientCompanyId: w.companyA2 });
    expect(res.status).toBe(200);
    expect(res.body.clientCompanyId).toBe(w.companyA2);
  });

  it('refuse de rattacher une société à un rôle interne', async () => {
    const res = await server().patch(`${API}/users/${w.users.salesA.id}`).set(admin.auth).send({ clientCompanyId: w.companyA1 });
    expect(res.status).toBe(422);
  });

  it('refuse une société inconnue ou d’une autre organisation', async () => {
    const companyB = (await t.prisma.system.clientCompany.findFirstOrThrow({ where: { organizationId: w.orgB } })).id;
    const res = await server().patch(`${API}/users/${w.users.clientA1.id}`).set(admin.auth).send({ clientCompanyId: companyB });
    expect(res.status).toBe(404);
  });

  it('réinitialise le mot de passe : nouveau mot de passe provisoire, sessions révoquées, connexion possible avec le nouveau', async () => {
    const clientSession = await login(t, w.users.clientA1.email);
    const before = await server().get(`${API}/projects`).set(clientSession.auth);
    expect(before.status).toBe(200);

    const res = await server()
      .post(`${API}/users/${w.users.clientA1.id}/reset-password`)
      .set(admin.auth)
      .send({ temporaryPassword: 'nouveau-provisoire-2026!' });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);

    // Le jeton d'accès reste signé valide (il est sans état), mais la base fait foi à chaque
    // requête (comme un changement de rôle) : le mot de passe provisoire bloque le reste de l'API.
    const blocked = await server().get(`${API}/projects`).set(clientSession.auth);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // Le jeton de RAFRAÎCHISSEMENT, lui, est bien révoqué : l'ancienne session ne peut pas se prolonger.
    const oldRefresh = await server().post(`${API}/auth/refresh`).set('Cookie', clientSession.cookie);
    expect(oldRefresh.status).toBe(401);

    const relogin = await login(t, w.users.clientA1.email, 'nouveau-provisoire-2026!');
    expect(relogin.auth.Authorization).toBeTruthy();
  });

  it('un rôle sans user.update est refusé', async () => {
    const s = await login(t, w.users.pmA.email);
    const res = await server().patch(`${API}/users/${w.users.salesA.id}`).set(s.auth).send({ firstName: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('cycle de vie (ENF-02)', () => {
  it('désactivation réversible : la connexion échoue, puis revient', async () => {
    await server().post(`${API}/users/${w.users.salesA.id}/deactivate`).set(admin.auth).expect(200);
    expect((await server().post(`${API}/auth/login`).send({ email: w.users.salesA.email, password: PASSWORD })).status).toBe(401);
    await server().post(`${API}/users/${w.users.salesA.id}/reactivate`).set(admin.auth).expect(200);
    await login(t, w.users.salesA.email);
  });

  it('anonymisation : l’identité disparaît, l’identifiant et l’historique restent', async () => {
    await t.prisma.system.projectStatusHistory.create({
      data: {
        organizationId: w.orgA,
        projectId: w.projectA1,
        fromStatus: 'ENGINEERING',
        toStatus: 'ARCHITECTURE',
        actorId: w.users.engineerA.id,
      },
    });
    const res = await server().post(`${API}/users/${w.users.engineerA.id}/anonymize`).set(admin.auth);
    expect(res.status).toBe(200);

    const user = await t.prisma.system.user.findUniqueOrThrow({ where: { id: w.users.engineerA.id } });
    expect(user.email).toBe(`supprime+${user.id}@invalide.local`);
    expect(user.firstName).toBe('Utilisateur');
    expect(user.anonymizedAt).not.toBeNull();
    expect(await t.prisma.system.projectStatusHistory.count({ where: { actorId: user.id } })).toBe(1);
    expect(await t.prisma.system.projectAssignment.count({ where: { userId: user.id } })).toBe(1);

    const again = await server().post(`${API}/auth/login`).send({ email: w.users.engineerA.email, password: PASSWORD });
    expect(again.status).toBe(401);
    const reactivate = await server().post(`${API}/users/${user.id}/reactivate`).set(admin.auth);
    expect(reactivate.status).toBe(422);
  });

  it('la liste des utilisateurs n’expose jamais d’empreinte de mot de passe', async () => {
    const res = await server().get(`${API}/users`).set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(7);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});
