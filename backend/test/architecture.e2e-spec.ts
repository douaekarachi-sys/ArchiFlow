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

  it('revalide côté serveur (ADR 0003) : une boucle envoyée directement à l’API, sans passer par l’interface, est refusée et rien n’est enregistré', async () => {
    // Document invalide construit à la main (jamais par le designer) : trois éléments reliés en
    // triangle forment une boucle, anomalie CRITICAL détectée par checkGraphAnomalies. Le serveur
    // doit refuser même si aucun client n'a jamais affiché ce document comme « compatible ».
    const loop: ArchitectureDocument = {
      elements: [
        { id: 'a', type: 'switch', equipmentModelId: null, label: 'A', position: { x: 0, y: 0 }, config: {} },
        { id: 'b', type: 'switch', equipmentModelId: null, label: 'B', position: { x: 100, y: 0 }, config: {} },
        { id: 'c', type: 'switch', equipmentModelId: null, label: 'C', position: { x: 50, y: 100 }, config: {} },
      ],
      connections: [
        { id: 'l1', from: 'a', to: 'b', linkType: 'copper' },
        { id: 'l2', from: 'b', to: 'c', linkType: 'copper' },
        { id: 'l3', from: 'c', to: 'a', linkType: 'copper' },
      ],
      zones: [],
    };

    const res = await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(loop);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ARCHITECTURE_INCOMPATIBLE');
    expect(res.body.error.details.anomalies).toContainEqual(
      expect.objectContaining({ severity: 'CRITICAL', code: 'validation.anomaly.loopDetected' }),
    );

    const reloaded = await server().get(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth);
    expect(reloaded.body).toEqual({ elements: [], connections: [], zones: [] });
  });

  it('revalide la capacité côté serveur (ADR 0003) : un dépassement de ports est refusé même si le client ne l’a jamais vu', async () => {
    const switchModelId = await createModel('switch');
    // Le catalogue donne 1 seul port à ce modèle (createModel n'en fixe aucun) : on le force via
    // une modification directe pour reproduire un dépassement de capacité déterministe.
    await t.prisma.system.equipmentModel.update({ where: { id: switchModelId }, data: { portCount: 1 } });

    const overflow: ArchitectureDocument = {
      elements: [
        { id: 'sw', type: 'switch', equipmentModelId: switchModelId, label: 'Switch 1 port', position: { x: 0, y: 0 }, config: {} },
        { id: 'a', type: 'server', equipmentModelId: null, label: 'Serveur A', position: { x: 100, y: 0 }, config: {} },
        { id: 'b', type: 'server', equipmentModelId: null, label: 'Serveur B', position: { x: 200, y: 0 }, config: {} },
      ],
      connections: [
        { id: 'l1', from: 'sw', to: 'a', linkType: 'copper' },
        { id: 'l2', from: 'sw', to: 'b', linkType: 'copper' },
      ],
      zones: [],
    };

    const res = await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(overflow);
    expect(res.status).toBe(422);
    expect(res.body.error.details.anomalies).toContainEqual(
      expect.objectContaining({ severity: 'CRITICAL', code: 'validation.capacity.portOverflow' }),
    );
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

describe('versions (EF-405, ADR 0001) — snapshot auto-porteur, historique, diff, restauration', () => {
  it('chaque sauvegarde crée une nouvelle version, jamais n’écrase la précédente', async () => {
    const firewallModelId = await createModel('firewall');
    const switchModelId = await createModel('switch');
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(sampleDocument(firewallModelId, switchModelId));
    await server()
      .put(`${API}/projects/${w.projectA1}/architecture`)
      .set(architect.auth)
      .send({ elements: [], connections: [], zones: [] });

    const versions = await server().get(`${API}/projects/${w.projectA1}/architecture/versions`).set(architect.auth);
    expect(versions.status).toBe(200);
    expect(versions.body.map((v: { number: number }) => v.number)).toEqual([2, 1]); // la plus récente d'abord
    expect(versions.body[0].author).toMatchObject({ id: w.users.architectA.id });
  });

  it('le snapshot fige les caractéristiques ET le prix du modèle au moment de la sauvegarde (ADR 0001)', async () => {
    const firewallModelId = await createModel('firewall');
    const switchModelId = await createModel('switch');
    await server()
      .patch(`${API}/catalog/equipment/${switchModelId}`)
      .set(admin.auth)
      .send({ portCount: 24, indicativePrice: 41000, currency: 'MAD' });
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(sampleDocument(firewallModelId, switchModelId));

    // Le catalogue évolue APRÈS la sauvegarde : le snapshot ne doit pas bouger.
    await server().patch(`${API}/catalog/equipment/${switchModelId}`).set(admin.auth).send({ indicativePrice: 99999 });

    const snapshot = await server().get(`${API}/projects/${w.projectA1}/architecture/versions/1`).set(architect.auth);
    expect(snapshot.status).toBe(200);
    const sw = snapshot.body.elements.find((e: { id: string }) => e.id === 'sw-01');
    expect(sw.frozenSpec).toMatchObject({ portCount: 24, indicativePrice: 41000, currency: 'MAD' });
  });

  it('compare deux versions et restitue le diff sémantique (+switches, -pare-feu)', async () => {
    const firewallModelId = await createModel('firewall');
    const switchModelId = await createModel('switch');
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(sampleDocument(firewallModelId, switchModelId));
    await server()
      .put(`${API}/projects/${w.projectA1}/architecture`)
      .set(architect.auth)
      .send({
        elements: [
          { id: 'sw-01', type: 'switch', equipmentModelId: switchModelId, label: 'Switch', position: { x: 0, y: 0 }, config: {} },
          { id: 'sw-02', type: 'switch', equipmentModelId: switchModelId, label: 'Switch 2', position: { x: 10, y: 0 }, config: {} },
        ],
        connections: [],
        zones: [],
      });

    const diff = await server().get(`${API}/projects/${w.projectA1}/architecture/versions/diff?from=1&to=2`).set(architect.auth);
    expect(diff.status).toBe(200);
    expect(diff.body.elements).toEqual(
      expect.arrayContaining([
        { category: 'firewall', added: 0, removed: 1, changed: 0 },
        { category: 'switch', added: 1, removed: 0, changed: 0 },
      ]),
    );
  });

  it('restaure une version ancienne : crée une NOUVELLE version, ne réécrase jamais l’historique', async () => {
    const firewallModelId = await createModel('firewall');
    const switchModelId = await createModel('switch');
    const v1 = sampleDocument(firewallModelId, switchModelId);
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(v1);
    await server()
      .put(`${API}/projects/${w.projectA1}/architecture`)
      .set(architect.auth)
      .send({ elements: [], connections: [], zones: [] });

    const restore = await server().post(`${API}/projects/${w.projectA1}/architecture/versions/1/restore`).set(architect.auth);
    expect(restore.status).toBe(201);
    expect(restore.body.elements).toHaveLength(2);

    const versions = await server().get(`${API}/projects/${w.projectA1}/architecture/versions`).set(architect.auth);
    expect(versions.body.map((v: { number: number; restoredFromVersion: number | null }) => [v.number, v.restoredFromVersion])).toEqual([
      [3, 1],
      [2, null],
      [1, null],
    ]);

    const current = await server().get(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth);
    expect(current.body.elements).toHaveLength(2);
  });

  it('une version d’un autre projet (portée, ADR 0006) répond 404', async () => {
    const res = await server().get(`${API}/projects/${w.projectA2}/architecture/versions/1`).set(architect.auth);
    expect(res.status).toBe(404);
  });

  it('l’ingénieur consulte l’historique mais ne peut pas restaurer', async () => {
    const firewallModelId = await createModel('firewall');
    const switchModelId = await createModel('switch');
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(architect.auth).send(sampleDocument(firewallModelId, switchModelId));

    const list = await server().get(`${API}/projects/${w.projectA1}/architecture/versions`).set(engineer.auth);
    expect(list.status).toBe(200);
    const restore = await server().post(`${API}/projects/${w.projectA1}/architecture/versions/1/restore`).set(engineer.auth);
    expect(restore.status).toBe(403);
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
