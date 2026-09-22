import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, type Session, type World } from './support/world';

let t: TestApp;
let w: World;
let architect: Session;
let client1: Session;
let client2: Session;
let engineerB: Session;
const server = () => request(t.app.getHttpServer());

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

beforeEach(async () => {
  w = await buildWorld(t.prisma);
  architect = await login(t, w.users.architectA.email);
  client1 = await login(t, w.users.clientA1.email);
  client2 = await login(t, w.users.clientA2.email);
  engineerB = await login(t, w.users.engineerB.email);
});

describe('messages de projet (T17, point 1) — comment.create, un seul modèle nouveau', () => {
  it('vide au départ, puis liste par ordre chronologique avec auteur et date', async () => {
    const empty = await server().get(`${API}/projects/${w.projectA1}/comments`).set(architect.auth);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);

    const first = await server().post(`${API}/projects/${w.projectA1}/comments`).set(architect.auth).send({ body: 'Le schéma logique est prêt pour revue.' });
    expect(first.status).toBe(201);
    expect(first.body.body).toBe('Le schéma logique est prêt pour revue.');
    expect(first.body.author).toMatchObject({ firstName: 'architectA', lastName: 'Test', role: 'ARCHITECT' });

    const second = await server().post(`${API}/projects/${w.projectA1}/comments`).set(client1.auth).send({ body: 'Merci, je regarde cela.' });
    expect(second.status).toBe(201);

    const list = await server().get(`${API}/projects/${w.projectA1}/comments`).set(architect.auth);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].body).toBe('Le schéma logique est prêt pour revue.');
    expect(list.body[1].body).toBe('Merci, je regarde cela.');
    expect(new Date(list.body[0].createdAt).getTime()).toBeLessThanOrEqual(new Date(list.body[1].createdAt).getTime());
  });

  it('partagé entre le client et l’équipe interne : le client lit les messages de l’équipe et réciproquement', async () => {
    await server().post(`${API}/projects/${w.projectA1}/comments`).set(architect.auth).send({ body: 'Message équipe' });
    const seenByClient = await server().get(`${API}/projects/${w.projectA1}/comments`).set(client1.auth);
    expect(seenByClient.status).toBe(200);
    expect(seenByClient.body).toHaveLength(1);
    expect(seenByClient.body[0].body).toBe('Message équipe');
  });

  it('rejette un message vide ou trop long (validation serveur, D-03)', async () => {
    const empty = await server().post(`${API}/projects/${w.projectA1}/comments`).set(architect.auth).send({ body: '' });
    expect(empty.status).toBe(400);

    const tooLong = await server().post(`${API}/projects/${w.projectA1}/comments`).set(architect.auth).send({ body: 'x'.repeat(4001) });
    expect(tooLong.status).toBe(400);
  });

  it('isolation par société cliente : un client d’une autre société du même locataire reçoit 404, jamais 403 (D-09)', async () => {
    const list = await server().get(`${API}/projects/${w.projectA1}/comments`).set(client2.auth);
    expect(list.status).toBe(404);

    const create = await server().post(`${API}/projects/${w.projectA1}/comments`).set(client2.auth).send({ body: 'Ne devrait pas passer' });
    expect(create.status).toBe(404);
  });

  it('isolation par organisation : un utilisateur d’un autre locataire reçoit 404, jamais 403 (D-09)', async () => {
    const list = await server().get(`${API}/projects/${w.projectA1}/comments`).set(engineerB.auth);
    expect(list.status).toBe(404);
  });

  it('refuse un accès non authentifié', async () => {
    const res = await server().get(`${API}/projects/${w.projectA1}/comments`);
    expect(res.status).toBe(401);
  });
});
