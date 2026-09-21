import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, type Session, type World } from './support/world';

let t: TestApp;
let w: World;
let clientA1: Session;
const server = () => request(t.app.getHttpServer());

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

beforeEach(async () => {
  w = await buildWorld(t.prisma);
  clientA1 = await login(t, w.users.clientA1.email);
});

describe('chatbot (T9) — repli local par défaut, sans réseau', () => {
  it('répond à une question de volumétrie avec le détail du calcul', async () => {
    const res = await server().post(`${API}/projects/${w.projectA1}/chat`).set(clientA1.auth).send({ message: '100 employés, combien de switches ?' });
    expect(res.status).toBe(201);
    expect(res.body.key).toBe('chatbot.sizingPorts');
    expect(res.body.steps.length).toBeGreaterThan(0);
    expect(res.body.shouldEscalate).toBe(false);
  });

  it('conseille de transmettre à l’équipe technique quand il ne sait pas répondre, sans décider seul', async () => {
    const res = await server().post(`${API}/projects/${w.projectA1}/chat`).set(clientA1.auth).send({ message: 'Quel jour sommes-nous ?' });
    expect(res.status).toBe(201);
    expect(res.body.key).toBe('chatbot.fallback');
    expect(res.body.shouldEscalate).toBe(true);
  });

  it('transmettre journalise réellement dans l’audit (ENF-07), pas un accusé de réception fictif', async () => {
    const res = await server().post(`${API}/projects/${w.projectA1}/chat/escalate`).set(clientA1.auth).send({ message: 'Quel est le coût total ?' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ escalated: true });

    const entry = await t.prisma.system.auditLog.findFirst({
      where: { action: 'chat.escalated', targetId: w.projectA1 },
    });
    expect(entry).not.toBeNull();
    expect((entry!.details as { message: string }).message).toBe('Quel est le coût total ?');
  });

  it('un CLIENT d’une autre société ne peut pas interroger le chatbot d’un projet qui n’est pas le sien : 404', async () => {
    const clientA2 = await login(t, w.users.clientA2.email);
    const res = await server().post(`${API}/projects/${w.projectA1}/chat`).set(clientA2.auth).send({ message: 'bonjour' });
    expect(res.status).toBe(404);
  });

  it('refuse un message vide (validation)', async () => {
    const res = await server().post(`${API}/projects/${w.projectA1}/chat`).set(clientA1.auth).send({ message: '' });
    expect(res.status).toBe(400);
  });
});
