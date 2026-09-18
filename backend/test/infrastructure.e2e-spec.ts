import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OrgScopeViolation } from '../src/core/prisma/org-scope';
import { RetentionWorker } from '../src/workers/retention.worker';
import { API, createTestApp, type TestApp } from './support/app';
import { buildWorld, type World } from './support/world';

let t: TestApp;
let w: World;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());
beforeEach(async () => {
  w = await buildWorld(t.prisma);
});

describe('filet d’isolation Prisma (ADR 0006, niveau 3)', () => {
  it('rejette une lecture sans organizationId sur le client « tenant »', async () => {
    await expect(t.prisma.tenant.project.findMany()).rejects.toBeInstanceOf(OrgScopeViolation);
    await expect(t.prisma.tenant.user.findFirst({ where: { email: w.users.adminA.email } })).rejects.toBeInstanceOf(
      OrgScopeViolation,
    );
  });

  it('rejette une écriture sans organizationId', async () => {
    await expect(
      t.prisma.tenant.project.updateMany({ where: { id: w.projectA1 }, data: { name: 'x' } }),
    ).rejects.toBeInstanceOf(OrgScopeViolation);
  });

  it('laisse passer une requête correctement filtrée', async () => {
    const projects = await t.prisma.tenant.project.findMany({ where: { organizationId: w.orgA } });
    expect(projects).toHaveLength(2);
  });

  it('s’applique aussi à l’intérieur d’une transaction', async () => {
    await expect(t.prisma.tenant.$transaction((tx) => tx.project.count())).rejects.toBeInstanceOf(OrgScopeViolation);
  });
});

describe('rétention des données (ENF-02)', () => {
  it('purge l’audit ancien et les jetons périmés, conserve le reste', async () => {
    const db = t.prisma.system;
    const now = new Date('2026-09-18T03:00:00Z');
    const old = new Date('2025-01-01T00:00:00Z');
    await db.auditLog.createMany({
      data: [
        { action: 'ancien', targetType: 'x', createdAt: old },
        { action: 'recent', targetType: 'x', createdAt: now },
      ],
    });
    await db.refreshToken.createMany({
      data: [
        { userId: w.users.adminA.id, familyId: w.orgA, tokenHash: 'a'.repeat(64), expiresAt: old },
        { userId: w.users.adminA.id, familyId: w.orgA, tokenHash: 'b'.repeat(64), expiresAt: new Date('2026-10-01'), revokedAt: new Date('2026-09-01') },
        { userId: w.users.adminA.id, familyId: w.orgA, tokenHash: 'c'.repeat(64), expiresAt: new Date('2026-10-01') },
      ],
    });

    const report = await t.app.get(RetentionWorker).run(now);
    expect(report.auditLogs).toBe(1);
    expect(report.refreshTokens).toBe(2);
    expect((await db.auditLog.findMany()).map((a) => a.action)).toEqual(['recent']);
    expect((await db.refreshToken.findMany()).map((r) => r.tokenHash)).toEqual(['c'.repeat(64)]);
  });

  it('signale les comptes inactifs sans les effacer', async () => {
    await t.prisma.system.user.update({
      where: { id: w.users.salesA.id },
      data: { lastLoginAt: new Date('2024-01-01') },
    });
    const report = await t.app.get(RetentionWorker).run(new Date('2026-09-18'));
    expect(report.inactiveAccountsToReview).toBeGreaterThanOrEqual(1);
    const sales = await t.prisma.system.user.findUniqueOrThrow({ where: { id: w.users.salesA.id } });
    expect(sales.anonymizedAt).toBeNull();
  });
});

describe('santé et en-têtes de sécurité', () => {
  it('répond sans authentification et rapporte l’état de la base', async () => {
    const res = await request(t.app.getHttpServer()).get(`${API}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok', backup: { configured: false } });
  });

  it('pose les en-têtes Helmet et masque la technologie', async () => {
    const res = await request(t.app.getHttpServer()).get(`${API}/health`);
    expect(res.headers['strict-transport-security']).toMatch(/max-age=31536000/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('une erreur inattendue ne divulgue ni pile ni détail interne', async () => {
    const res = await request(t.app.getHttpServer()).get(`${API}/route-inexistante`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
  });
});
