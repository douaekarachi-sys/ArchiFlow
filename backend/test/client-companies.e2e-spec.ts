import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, type Session, type World } from './support/world';

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

describe('sociétés clientes (T15) — créer, modifier, archiver', () => {
  it('crée une société cliente, visible en lecture', async () => {
    const res = await server().post(`${API}/client-companies`).set(admin.auth).send({ name: 'Nouvelle société', city: 'Rabat', country: 'ma' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Nouvelle société', city: 'Rabat', country: 'MA' });

    const list = await server().get(`${API}/client-companies`).set(admin.auth);
    expect(list.body.map((c: { name: string }) => c.name)).toContain('Nouvelle société');
  });

  it('refuse deux sociétés du même nom dans la même organisation', async () => {
    await server().post(`${API}/client-companies`).set(admin.auth).send({ name: 'Doublon' });
    const res = await server().post(`${API}/client-companies`).set(admin.auth).send({ name: 'Doublon' });
    expect(res.status).toBe(409);
  });

  it('modifie une société existante', async () => {
    const created = await server().post(`${API}/client-companies`).set(admin.auth).send({ name: 'À renommer', city: 'Fès' });
    const res = await server().patch(`${API}/client-companies/${created.body.id}`).set(admin.auth).send({ city: 'Marrakech' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'À renommer', city: 'Marrakech' });
  });

  it('archive une société : disparaît de la liste active, reste lisible avec includeArchived', async () => {
    const created = await server().post(`${API}/client-companies`).set(admin.auth).send({ name: 'À archiver' });
    const archived = await server().post(`${API}/client-companies/${created.body.id}/archive`).set(admin.auth);
    expect(archived.status).toBe(200);
    expect(archived.body.deletedAt).not.toBeNull();

    const active = await server().get(`${API}/client-companies`).set(admin.auth);
    expect(active.body.map((c: { id: string }) => c.id)).not.toContain(created.body.id);

    const all = await server().get(`${API}/client-companies?includeArchived=true`).set(admin.auth);
    expect(all.body.map((c: { id: string }) => c.id)).toContain(created.body.id);
  });

  it('un rôle sans clientCompany.manage ne peut ni créer, ni modifier, ni archiver', async () => {
    const engineer = await login(t, w.users.engineerA.email);
    expect((await server().post(`${API}/client-companies`).set(engineer.auth).send({ name: 'X' })).status).toBe(403);
    expect((await server().patch(`${API}/client-companies/${w.companyA1}`).set(engineer.auth).send({ city: 'X' })).status).toBe(403);
    expect((await server().post(`${API}/client-companies/${w.companyA1}/archive`).set(engineer.auth)).status).toBe(403);
  });

  it('isolation entre locataires (ADR 0006) : modifier ou archiver la société d’un autre locataire répond 404', async () => {
    const res1 = await server().patch(`${API}/client-companies/${w.companyB1}`).set(admin.auth).send({ city: 'X' });
    expect(res1.status).toBe(404);
    const res2 = await server().post(`${API}/client-companies/${w.companyB1}/archive`).set(admin.auth);
    expect(res2.status).toBe(404);
  });
});
