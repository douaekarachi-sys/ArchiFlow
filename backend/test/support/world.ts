import bcrypt from 'bcryptjs';
import type { ProjectStatus, Role } from '@archiflow/shared';
import request from 'supertest';
import type { PrismaService } from '../../src/core/prisma/prisma.service';
import { API, type TestApp } from './app';

export const PASSWORD = 'mot-de-passe-de-test-2026';

/** Vide toutes les tables métier (la table des migrations est conservée). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.system.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  if (list) await prisma.system.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

type Users = Record<
  'adminA' | 'pmA' | 'engineerA' | 'architectA' | 'salesA' | 'clientA1' | 'clientA2' | 'adminB' | 'engineerB',
  { id: string; email: string; role: Role }
>;

export interface World {
  orgA: string;
  orgB: string;
  companyA1: string;
  companyA2: string;
  companyB1: string;
  users: Users;
  /** Projet de la société A1, en conception, équipe complète affectée. */
  projectA1: string;
  /** Projet de la société A2, brouillon, aucune affectation. */
  projectA2: string;
  /** Projet du locataire B. */
  projectB: string;
}

/**
 * Deux locataires ; dans le locataire A, deux sociétés clientes. C'est le minimum pour éprouver
 * les deux niveaux d'isolation (ADR 0006).
 */
export async function buildWorld(prisma: PrismaService): Promise<World> {
  await resetDatabase(prisma);
  const db = prisma.system;
  const passwordHash = await bcrypt.hash(PASSWORD, 4);

  const orgA = (await db.organization.create({ data: { name: 'Intégrateur A', slug: 'org-a' } })).id;
  const orgB = (await db.organization.create({ data: { name: 'Intégrateur B', slug: 'org-b' } })).id;
  const companyA1 = (await db.clientCompany.create({ data: { organizationId: orgA, name: 'Client A1' } })).id;
  const companyA2 = (await db.clientCompany.create({ data: { organizationId: orgA, name: 'Client A2' } })).id;
  const companyB1 = (await db.clientCompany.create({ data: { organizationId: orgB, name: 'Client B1' } })).id;

  const spec: [keyof Users, Role, string, string | null][] = [
    ['adminA', 'ADMIN', orgA, null],
    ['pmA', 'PROJECT_MANAGER', orgA, null],
    ['engineerA', 'ENGINEER', orgA, null],
    ['architectA', 'ARCHITECT', orgA, null],
    ['salesA', 'SALES', orgA, null],
    ['clientA1', 'CLIENT', orgA, companyA1],
    ['clientA2', 'CLIENT', orgA, companyA2],
    ['adminB', 'ADMIN', orgB, null],
    ['engineerB', 'ENGINEER', orgB, null],
  ];
  const users = {} as Users;
  for (const [key, role, organizationId, clientCompanyId] of spec) {
    const email = `${key.toLowerCase()}@test.local`;
    const user = await db.user.create({
      data: { organizationId, clientCompanyId, email, firstName: key, lastName: 'Test', passwordHash, role },
    });
    users[key] = { id: user.id, email, role };
  }

  const project = async (organizationId: string, clientCompanyId: string, name: string, status: ProjectStatus) =>
    (
      await db.project.create({
        data: { organizationId, clientCompanyId, name, status, createdById: users.adminA.id },
      })
    ).id;

  const projectA1 = await project(orgA, companyA1, 'Projet A1', 'ARCHITECTURE');
  const projectA2 = await project(orgA, companyA2, 'Projet A2', 'DRAFT');
  const projectB = await project(orgB, companyB1, 'Projet B', 'ENGINEERING');

  for (const key of ['pmA', 'engineerA', 'architectA', 'salesA'] as const) {
    await db.projectAssignment.create({
      data: {
        organizationId: orgA,
        projectId: projectA1,
        userId: users[key].id,
        role: users[key].role,
        assignedById: users.adminA.id,
      },
    });
  }
  await db.projectAssignment.create({
    data: { organizationId: orgB, projectId: projectB, userId: users.engineerB.id, role: 'ENGINEER', assignedById: users.adminB.id },
  });

  return { orgA, orgB, companyA1, companyA2, companyB1, users, projectA1, projectA2, projectB };
}

export interface Session {
  token: string;
  cookie: string;
  auth: { Authorization: string };
}

/** Connexion réelle par l'API : les tests n'inventent jamais de jeton. */
export async function login(t: TestApp, email: string, password = PASSWORD): Promise<Session> {
  const res = await request(t.app.getHttpServer()).post(`${API}/auth/login`).send({ email, password });
  if (res.status !== 200) throw new Error(`Connexion impossible pour ${email} : ${res.status} ${JSON.stringify(res.body)}`);
  const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = setCookie.find((c) => c.startsWith('af_rt=')) ?? '';
  const token = res.body.accessToken as string;
  return { token, cookie: cookie.split(';')[0] ?? '', auth: { Authorization: `Bearer ${token}` } };
}
