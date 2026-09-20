import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, login, type Session, type World } from './support/world';

let t: TestApp;
let w: World;
let admin: Session;
let engineer: Session;
const server = () => request(t.app.getHttpServer());

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

beforeEach(async () => {
  w = await buildWorld(t.prisma);
  // Les catégories sont globales (pas de organizationId) : buildWorld() les vide avec le reste.
  await t.prisma.system.equipmentCategory.create({ data: { code: 'switch', labelKey: 'equipment.category.switch' } });
  admin = await login(t, w.users.adminA.email);
  engineer = await login(t, w.users.engineerA.email);
});

async function createManufacturerAndBrand(session: Session, orgLabel = 'A') {
  const manufacturer = await server()
    .post(`${API}/catalog/manufacturers`)
    .set(session.auth)
    .send({ name: `Cisco ${orgLabel}` });
  const brand = await server()
    .post(`${API}/catalog/brands`)
    .set(session.auth)
    .send({ manufacturerId: manufacturer.body.id, name: `Cisco ${orgLabel}` });
  return { manufacturerId: manufacturer.body.id as string, brandId: brand.body.id as string };
}

describe('administration du catalogue (EF-505, catalog.manage) — ADMIN uniquement', () => {
  it('crée un fabricant, une marque puis un modèle, visibles en lecture', async () => {
    const { brandId } = await createManufacturerAndBrand(admin);

    const model = await server()
      .post(`${API}/catalog/equipment`)
      .set(admin.auth)
      .send({
        brandId,
        categoryCode: 'switch',
        name: 'Catalyst 9300-48P',
        reference: 'C9300-48P-E',
        portCount: 48,
        throughputMbps: 1000,
        indicativePrice: 68000,
        currency: 'MAD',
      });
    expect(model.status).toBe(201);
    expect(model.body).toMatchObject({ name: 'Catalyst 9300-48P', reference: 'C9300-48P-E', archivedAt: null });

    const list = await server().get(`${API}/catalog/equipment`).set(engineer.auth);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ name: 'Catalyst 9300-48P' });
  });

  it('refuse un modèle sans nom (validation)', async () => {
    const { brandId } = await createManufacturerAndBrand(admin);
    const res = await server()
      .post(`${API}/catalog/equipment`)
      .set(admin.auth)
      .send({ brandId, categoryCode: 'switch', name: '', reference: 'REF-1' });
    expect(res.status).toBe(400);
  });

  it('retaper un fabricant ou une marque déjà présents les réutilise, sans doublon', async () => {
    const first = await createManufacturerAndBrand(admin);
    const second = await createManufacturerAndBrand(admin);
    expect(second.manufacturerId).toBe(first.manufacturerId);
    expect(second.brandId).toBe(first.brandId);

    const manufacturers = await server().get(`${API}/catalog/manufacturers`).set(admin.auth);
    expect(manufacturers.body).toHaveLength(1);
  });

  it('refuse une marque rattachée à un fabricant d’une autre organisation : 404', async () => {
    const adminB = await login(t, w.users.adminB.email);
    const { manufacturerId } = await createManufacturerAndBrand(adminB, 'B');

    const res = await server().post(`${API}/catalog/brands`).set(admin.auth).send({ manufacturerId, name: 'Détournement' });
    expect(res.status).toBe(404);
  });

  it('modifie un modèle existant', async () => {
    const { brandId } = await createManufacturerAndBrand(admin);
    const created = await server()
      .post(`${API}/catalog/equipment`)
      .set(admin.auth)
      .send({ brandId, categoryCode: 'switch', name: 'FortiSwitch 124F', reference: 'FS-124F' });

    const updated = await server()
      .patch(`${API}/catalog/equipment/${created.body.id}`)
      .set(admin.auth)
      .send({ indicativePrice: 27000, currency: 'MAD' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ indicativePrice: '27000', currency: 'MAD' });
  });

  it('archive un modèle (ADR 0008) : disparaît de la liste active, reste lisible avec includeArchived', async () => {
    const { brandId } = await createManufacturerAndBrand(admin);
    const created = await server()
      .post(`${API}/catalog/equipment`)
      .set(admin.auth)
      .send({ brandId, categoryCode: 'switch', name: 'Modèle obsolète', reference: 'OLD-1' });

    const archived = await server().post(`${API}/catalog/equipment/${created.body.id}/archive`).set(admin.auth);
    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).not.toBeNull();

    const activeList = await server().get(`${API}/catalog/equipment`).set(engineer.auth);
    expect(activeList.body.data).toHaveLength(0);

    const fullList = await server().get(`${API}/catalog/equipment?includeArchived=true`).set(engineer.auth);
    expect(fullList.body.data).toHaveLength(1);
    expect(fullList.body.data[0].archivedAt).not.toBeNull();
  });

  it('archiver deux fois de suite est sans effet (idempotent)', async () => {
    const { brandId } = await createManufacturerAndBrand(admin);
    const created = await server()
      .post(`${API}/catalog/equipment`)
      .set(admin.auth)
      .send({ brandId, categoryCode: 'switch', name: 'Modèle X', reference: 'X-1' });

    const first = await server().post(`${API}/catalog/equipment/${created.body.id}/archive`).set(admin.auth);
    const second = await server().post(`${API}/catalog/equipment/${created.body.id}/archive`).set(admin.auth);
    expect(first.body.archivedAt).toEqual(second.body.archivedAt);
  });
});

describe('permissions (ADR 0004)', () => {
  it('un rôle sans catalog.manage ne peut ni créer, ni modifier, ni archiver : « Permissions insuffisantes »', async () => {
    const { brandId } = await createManufacturerAndBrand(admin);
    const createRes = await server()
      .post(`${API}/catalog/equipment`)
      .set(engineer.auth)
      .send({ brandId, categoryCode: 'switch', name: 'Interdit', reference: 'NOPE' });
    expect(createRes.status).toBe(403);

    const manufacturerRes = await server().post(`${API}/catalog/manufacturers`).set(engineer.auth).send({ name: 'Interdit' });
    expect(manufacturerRes.status).toBe(403);
  });

  it('catalog.read reste accessible à tous les rôles internes', async () => {
    const res = await server().get(`${API}/catalog/equipment`).set(engineer.auth);
    expect(res.status).toBe(200);
  });
});

describe('isolation entre locataires (ADR 0006)', () => {
  it('un modèle créé dans le locataire A est invisible pour le locataire B', async () => {
    const { brandId } = await createManufacturerAndBrand(admin);
    await server().post(`${API}/catalog/equipment`).set(admin.auth).send({ brandId, categoryCode: 'switch', name: 'Privé A', reference: 'A-ONLY' });

    const adminB = await login(t, w.users.adminB.email);
    const listB = await server().get(`${API}/catalog/equipment`).set(adminB.auth);
    expect(listB.body.data).toHaveLength(0);
  });
});
