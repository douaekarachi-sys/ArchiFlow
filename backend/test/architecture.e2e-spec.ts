import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ArchitectureDocument } from '@archiflow/shared';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, type Session, type World } from './support/world';

let t: TestApp;
let w: World;
let admin: Session;
let architect: Session;
let engineer: Session;
const server = () => request(t.app.getHttpServer());

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

beforeEach(async () => {
  w = await buildWorld(t.prisma);
  await t.prisma.system.equipmentCategory.create({ data: { code: 'firewall', labelKey: 'equipment.category.firewall' } });
  await t.prisma.system.equipmentCategory.create({ data: { code: 'switch', labelKey: 'equipment.category.switch' } });
  admin = await login(t, w.users.adminA.email);
  architect = await login(t, w.users.architectA.email);
  engineer = await login(t, w.users.engineerA.email);
});

async function createModel(categoryCode: string) {
  const manufacturer = await server().post(`${API}/catalog/manufacturers`).set(admin.auth).send({ name: `Fabricant ${categoryCode}` });
  const brand = await server()
    .post(`${API}/catalog/brands`)
    .set(admin.auth)
    .send({ manufacturerId: manufacturer.body.id, name: `Marque ${categoryCode}` });
  const model = await server()
    .post(`${API}/catalog/equipment`)
    .set(admin.auth)
    .send({ brandId: brand.body.id, categoryCode, name: `Modèle ${categoryCode}`, reference: `REF-${categoryCode}` });
  return model.body.id as string;
}

function sampleDocument(firewallModelId: string, switchModelId: string): ArchitectureDocument {
  return {
    elements: [
      { id: 'fw-01', type: 'firewall', equipmentModelId: firewallModelId, label: 'Pare-feu principal', position: { x: 0, y: 0 }, config: {} },
      { id: 'sw-01', type: 'switch', equipmentModelId: switchModelId, label: 'Switch cœur', position: { x: 200, y: 0 }, config: {} },
    ],
    connections: [
      { id: 'link-01', from: 'fw-01', to: 'sw-01', linkType: 'copper', speedMbps: 1000 },
    ],
    zones: [{ id: 'zone-dmz', type: 'DMZ', label: 'DMZ', elementIds: ['fw-01'] }],
  };
}

describe('conception d’architecture (EF-101 à EF-107, architecture.edit) — ARCHITECT et ADMIN', () => {
  it('un projet jamais sauvegardé renvoie un document vide', async () => {
    const res = await server().get(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ elements: [], connections: [], zones: [] });
  });

  it('sauvegarde puis relit un document complet : éléments, connexion nommée, zone', async () => {
    const firewallModelId = await createModel('firewall');
    const switchModelId = await createModel('switch');
    const document = sampleDocument(firewallModelId, switchModelId);

    const saved = await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(document);
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual(document);

    const reloaded = await server().get(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body).toEqual(document);
  });

  it('une seconde sauvegarde remplace intégralement la précédente (pas de fusion)', async () => {
    const firewallModelId = await createModel('firewall');
    const switchModelId = await createModel('switch');
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(sampleDocument(firewallModelId, switchModelId));

    const smaller: ArchitectureDocument = {
      elements: [{ id: 'sw-01', type: 'switch', equipmentModelId: switchModelId, label: 'Switch seul', position: { x: 10, y: 10 }, config: {} }],
      connections: [],
      zones: [],
    };
    const replaced = await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(smaller);
    expect(replaced.status).toBe(200);

    const reloaded = await server().get(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth);
    expect(reloaded.body).toEqual(smaller);
  });

  it('refuse une connexion vers un élément inconnu (schéma partagé)', async () => {
    const document: ArchitectureDocument = {
      elements: [{ id: 'fw-01', type: 'firewall', equipmentModelId: null, label: 'Pare-feu', position: { x: 0, y: 0 }, config: {} }],
      connections: [{ id: 'link-01', from: 'fw-01', to: 'fantome', linkType: 'copper' }],
      zones: [],
    };
    const res = await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(document);
    expect(res.status).toBe(400);
  });

  it('refuse un equipmentModelId d’une autre organisation', async () => {
    const adminB = await login(t, w.users.adminB.email);
    const manufacturerB = await server().post(`${API}/catalog/manufacturers`).set(adminB.auth).send({ name: 'Fabricant B' });
    const brandB = await server().post(`${API}/catalog/brands`).set(adminB.auth).send({ manufacturerId: manufacturerB.body.id, name: 'Marque B' });
    const modelB = await server()
      .post(`${API}/catalog/equipment`)
      .set(adminB.auth)
      .send({ brandId: brandB.body.id, categoryCode: 'switch', name: 'Modèle B', reference: 'REF-B' });

    const document: ArchitectureDocument = {
      elements: [{ id: 'sw-01', type: 'switch', equipmentModelId: modelB.body.id, label: 'Détournement', position: { x: 0, y: 0 }, config: {} }],
      connections: [],
      zones: [],
    };
    const res = await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(document);
    expect(res.status).toBe(404);
  });
});

describe('permissions (ADR 0004) — l’ingénieur dimensionne, il ne conçoit pas', () => {
  it('l’ingénieur lit l’architecture mais ne peut pas la modifier', async () => {
    const read = await server().get(`${API}/projects/${w.projectA1}/architecture`).set(engineer.auth);
    expect(read.status).toBe(200);

    const write = await server()
      .put(`${API}/projects/${w.projectA1}/architecture`)
      .set(engineer.auth)
      .send({ elements: [], connections: [], zones: [] });
    expect(write.status).toBe(403);
  });
});

describe('portée et isolation (ADR 0006)', () => {
  it('un architecte non affecté au projet reçoit 404, pas 403', async () => {
    const res = await server().get(`${API}/projects/${w.projectA2}/architecture`).set(architect.auth);
    expect(res.status).toBe(404);
  });

  it('un autre locataire ne trouve pas le projet : 404', async () => {
    const adminB = await login(t, w.users.adminB.email);
    const res = await server().get(`${API}/projects/${w.projectA1}/architecture`).set(adminB.auth);
    expect(res.status).toBe(404);
  });
});
