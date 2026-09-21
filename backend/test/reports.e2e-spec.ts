import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ArchitectureDocument } from '@archiflow/shared';
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
  await t.prisma.system.equipmentCategory.create({ data: { code: 'firewall', labelKey: 'equipment.category.firewall' } });
  admin = await login(t, w.users.adminA.email);
});

describe('export PDF (EF-301) — informations client, schéma logique, équipements, BOM, coûts', () => {
  it('génère un PDF valide pour une architecture jamais sauvegardée (document vide)', async () => {
    const res = await server().get(`${API}/projects/${w.projectA1}/report/pdf`).set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.slice(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('génère un PDF pour une architecture avec équipements chiffrés', async () => {
    const manufacturer = await server().post(`${API}/catalog/manufacturers`).set(admin.auth).send({ name: 'Fabricant' });
    const brand = await server().post(`${API}/catalog/brands`).set(admin.auth).send({ manufacturerId: manufacturer.body.id, name: 'Marque' });
    const model = await server()
      .post(`${API}/catalog/equipment`)
      .set(admin.auth)
      .send({ brandId: brand.body.id, categoryCode: 'firewall', name: 'Pare-feu', reference: 'REF-1', indicativePrice: 21000, currency: 'MAD' });

    const document: ArchitectureDocument = {
      elements: [{ id: 'fw-01', type: 'firewall', equipmentModelId: model.body.id, label: 'Pare-feu principal', position: { x: 0, y: 0 }, config: {} }],
      connections: [],
      zones: [],
    };
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(admin.auth).send(document);

    const res = await server().get(`${API}/projects/${w.projectA1}/report/pdf`).set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.slice(0, 4).toString('latin1')).toBe('%PDF');
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it('génère un PDF incluant le plan d’adressage IP/VLAN (EF-207) quand il existe', async () => {
    const document: ArchitectureDocument = {
      elements: [],
      connections: [],
      zones: [],
      networks: [{ id: 'lan-01', name: 'LAN utilisateurs', vlanId: 10, cidr: '192.168.10.0/24', gateway: '192.168.10.1' }],
    };
    await server().put(`${API}/projects/${w.projectA1}/architecture`).set(admin.auth).send(document);

    const withoutNetwork = await server().get(`${API}/projects/${w.projectA2}/report/pdf`).set(admin.auth);
    const withNetwork = await server().get(`${API}/projects/${w.projectA1}/report/pdf`).set(admin.auth);
    expect(withNetwork.status).toBe(200);
    expect(withNetwork.body.slice(0, 4).toString('latin1')).toBe('%PDF');
    // Une page en plus (tableau d'adressage) rend le PDF plus volumineux que sans réseau défini.
    expect(withNetwork.body.length).toBeGreaterThan(withoutNetwork.body.length);
  });

  it('un rôle sans bom.read (ingénieur) est refusé', async () => {
    const engineer = await login(t, w.users.engineerA.email);
    const res = await server().get(`${API}/projects/${w.projectA1}/report/pdf`).set(engineer.auth);
    expect(res.status).toBe(403);
  });

  it('un projet d’un autre locataire répond 404', async () => {
    const adminB = await login(t, w.users.adminB.email);
    const res = await server().get(`${API}/projects/${w.projectA1}/report/pdf`).set(adminB.auth);
    expect(res.status).toBe(404);
  });
});
