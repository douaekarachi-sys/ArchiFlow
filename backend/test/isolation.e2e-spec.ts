/**
 * Isolation multi-organisations — ADR 0006. DEUX suites distinctes :
 *
 * 1. entre locataires : un utilisateur du locataire B face aux ressources du locataire A ;
 * 2. entre sociétés clientes d'un MÊME locataire : le CLIENT de la société A2 face au projet de A1.
 *
 * Dans les deux cas la réponse est 404, jamais 403 : un 403 confirmerait l'existence de la ressource.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, type Session, type World } from './support/world';

let t: TestApp;
let w: World;
const server = () => request(t.app.getHttpServer());

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

describe('suite 1 — entre locataires', () => {
  let adminB: Session;
  let engineerB: Session;

  beforeEach(async () => {
    w = await buildWorld(t.prisma);
    adminB = await login(t, w.users.adminB.email);
    engineerB = await login(t, w.users.engineerB.email);
  });

  const projectRoutes = () => [
    ['GET', `/projects/${w.projectA1}`],
    ['GET', `/projects/${w.projectA1}/history`],
    ['GET', `/projects/${w.projectA1}/transitions`],
    ['POST', `/projects/${w.projectA1}/transitions`, { to: 'INTERNAL_REVIEW' }],
    ['POST', `/projects/${w.projectA1}/assignments`, { userId: w.users.adminB.id, role: 'ENGINEER' }],
  ] as const;

  it('l’administrateur du locataire B ne trouve AUCUN projet du locataire A', async () => {
    for (const [method, path, body] of projectRoutes()) {
      const call = method === 'GET' ? server().get(API + path) : server().post(API + path).send(body ?? {});
      const res = await call.set(adminB.auth);
      expect(res.status, `${method} ${path}`).toBe(404);
    }
  });

  it('un rôle interne du locataire B ne trouve aucun projet du locataire A', async () => {
    const res = await server().get(`${API}/projects/${w.projectA1}`).set(engineerB.auth);
    expect(res.status).toBe(404);
  });

  it('les listes ne contiennent que les ressources du locataire', async () => {
    const projects = await server().get(`${API}/projects`).set(adminB.auth);
    expect(projects.body.data.map((p: { id: string }) => p.id)).toEqual([w.projectB]);

    const users = await server().get(`${API}/users`).set(adminB.auth);
    const orgBIds = [w.users.adminB.id, w.users.engineerB.id].sort();
    expect(users.body.data.map((u: { id: string }) => u.id).sort()).toEqual(orgBIds);

    const companies = await server().get(`${API}/client-companies`).set(adminB.auth);
    expect(companies.body.map((c: { id: string }) => c.id)).toEqual([w.companyB1]);
  });

  it('l’administrateur du locataire B ne peut agir sur aucun utilisateur du locataire A', async () => {
    const target = w.users.salesA.id;
    // Requêtes construites au moment de l'envoi : supertest ouvre un port par requête.
    const calls = [
      () => server().patch(`${API}/users/${target}/role`).set(adminB.auth).send({ role: 'ENGINEER' }),
      () => server().post(`${API}/users/${target}/deactivate`).set(adminB.auth),
      () => server().post(`${API}/users/${target}/reactivate`).set(adminB.auth),
      () => server().post(`${API}/users/${target}/anonymize`).set(adminB.auth),
    ];
    for (const call of calls) expect((await call()).status).toBe(404);
    const untouched = await t.prisma.system.user.findUniqueOrThrow({ where: { id: target } });
    expect(untouched).toMatchObject({ role: 'SALES', deletedAt: null, anonymizedAt: null });
  });

  it('ne peut ni créer un projet ni un compte dans une société du locataire A', async () => {
    const project = await server()
      .post(`${API}/projects`)
      .set(adminB.auth)
      .send({ name: 'Intrusion', clientCompanyId: w.companyA1 });
    expect(project.status).toBe(404);
    const user = await server().post(`${API}/users`).set(adminB.auth).send({
      firstName: 'X',
      lastName: 'Y',
      email: 'intrus@test.local',
      temporaryPassword: 'mot-de-passe-intrus',
      role: 'CLIENT',
      clientCompanyId: w.companyA1,
    });
    expect(user.status).toBe(404);
  });

  it('ne peut pas affecter un utilisateur du locataire A à son propre projet', async () => {
    const res = await server()
      .post(`${API}/projects/${w.projectB}/assignments`)
      .set(adminB.auth)
      .send({ userId: w.users.engineerA.id, role: 'ENGINEER' });
    expect(res.status).toBe(404);
  });

  it('le journal d’audit ne montre que les événements du locataire', async () => {
    await login(t, w.users.adminA.email);
    const res = await server().get(`${API}/audit-logs`).set(adminB.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.every((e: { organizationId: string }) => e.organizationId === w.orgB)).toBe(true);
  });

  it('un identifiant mal formé répond 404, comme un identifiant inconnu', async () => {
    expect((await server().get(`${API}/projects/pas-un-uuid`).set(adminB.auth)).status).toBe(404);
  });

  it('bloque de façon générique chaque route authentifiée qui cible une ressource du locataire A', async () => {
    const assignmentId = await t.prisma.system.projectAssignment.findFirstOrThrow({
      where: { projectId: w.projectA1, organizationId: w.orgA },
      select: { id: true },
    });

    const cases = [
      ['GET', `/projects/${w.projectA1}`],
      ['GET', `/projects/${w.projectA1}/history`],
      ['GET', `/projects/${w.projectA1}/transitions`],
      ['POST', `/projects/${w.projectA1}/transitions`, { to: 'INTERNAL_REVIEW' }],
      ['POST', `/projects/${w.projectA1}/assignments`, { userId: w.users.adminB.id, role: 'ENGINEER' }],
      ['DELETE', `/projects/${w.projectA1}/assignments/${assignmentId.id}`],
      ['PATCH', `/users/${w.users.salesA.id}/role`, { role: 'ENGINEER' }],
      ['POST', `/users/${w.users.salesA.id}/deactivate`],
      ['POST', `/users/${w.users.salesA.id}/reactivate`],
      ['POST', `/users/${w.users.salesA.id}/anonymize`],
    ] as const;

    for (const [method, path, body] of cases) {
      const call =
        method === 'GET'
          ? server().get(API + path)
          : method === 'PATCH'
            ? server().patch(API + path).send(body ?? {})
            : method === 'DELETE'
              ? server().delete(API + path)
              : server().post(API + path).send(body ?? {});

      const res = await call.set(adminB.auth);
      expect(res.status, `${method} ${path}`).toBe(404);
    }
  });
});

describe('suite 2 — entre sociétés clientes d’un même locataire', () => {
  let clientA2: Session;

  beforeEach(async () => {
    w = await buildWorld(t.prisma);
    clientA2 = await login(t, w.users.clientA2.email);
  });

  it('le CLIENT de la société A2 ne trouve pas le projet de la société A1', async () => {
    for (const path of [`/projects/${w.projectA1}`, `/projects/${w.projectA1}/history`, `/projects/${w.projectA1}/transitions`]) {
      const res = await server().get(API + path).set(clientA2.auth);
      expect(res.status, path).toBe(404);
    }
  });

  it('ne peut pas faire avancer le projet d’une autre société', async () => {
    await t.prisma.system.project.update({ where: { id: w.projectA1 }, data: { status: 'CLIENT_REVIEW' } });
    const res = await server()
      .post(`${API}/projects/${w.projectA1}/transitions`)
      .set(clientA2.auth)
      .send({ to: 'CLIENT_APPROVED' });
    expect(res.status).toBe(404);
    const project = await t.prisma.system.project.findUniqueOrThrow({ where: { id: w.projectA1 } });
    expect(project.status).toBe('CLIENT_REVIEW');
  });

  it('sa liste ne contient que les projets de sa société', async () => {
    const res = await server().get(`${API}/projects`).set(clientA2.auth);
    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([w.projectA2]);
  });

  it('un CLIENT ne consulte ni les utilisateurs, ni les sociétés, ni l’audit', async () => {
    for (const path of ['/users', '/client-companies', '/audit-logs']) {
      expect((await server().get(API + path).set(clientA2.auth)).status, path).toBe(403);
    }
  });
});
