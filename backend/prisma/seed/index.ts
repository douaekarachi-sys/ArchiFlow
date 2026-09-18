/**
 * Seed de démonstration — base de DÉVELOPPEMENT uniquement.
 *
 * Rejouable et destructif : il vide les tables avant de les remplir. Il refuse de s'exécuter
 * en production. Tous les comptes partagent un mot de passe de démonstration, affiché en fin
 * d'exécution ; ils ne doivent exister sur aucun environnement accessible depuis l'extérieur.
 *
 * Le catalogue de démonstration (fabricants, modèles, prix marqués DEMO DATA) arrive en Phase 3.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import {
  EQUIPMENT_CATEGORIES,
  PROJECT_STATUSES,
  PROJECT_TRANSITIONS,
  type ProjectStatus,
  type Role,
} from '@archiflow/shared';
import { PrismaClient } from '../../src/generated/prisma/client';

const rootEnv = resolve(__dirname, '..', '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

if (process.env['NODE_ENV'] === 'production') {
  console.error('Seed refusé : NODE_ENV=production.');
  process.exit(1);
}

const DEMO_PASSWORD = process.env['SEED_PASSWORD'] ?? 'Demo-ArchiFlow-2026';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });

const ACCOUNTS: { role: Role; email: string; firstName: string; lastName: string }[] = [
  { role: 'ADMIN', email: 'admin@archiflow.local', firstName: 'Amina', lastName: 'Alaoui' },
  { role: 'PROJECT_MANAGER', email: 'pm@archiflow.local', firstName: 'Youssef', lastName: 'Bennani' },
  { role: 'ENGINEER', email: 'engineer@archiflow.local', firstName: 'Salma', lastName: 'Tazi' },
  { role: 'ARCHITECT', email: 'architect@archiflow.local', firstName: 'Karim', lastName: 'Idrissi' },
  { role: 'SALES', email: 'sales@archiflow.local', firstName: 'Nadia', lastName: 'Chraibi' },
  { role: 'CLIENT', email: 'client@archiflow.local', firstName: 'Omar', lastName: 'El Fassi' },
];

/** Chemin nominal, suivi pour donner à chaque projet un historique cohérent. */
const HAPPY_PATH: ProjectStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'ENGINEERING',
  'ARCHITECTURE',
  'INTERNAL_REVIEW',
  'COMMERCIAL_REVIEW',
  'CLIENT_REVIEW',
  'CLIENT_APPROVED',
  'COMPLETED',
];
/** Statuts hors chemin nominal : la boucle de correction CLIENT_COMMENTS → REVISION. */
const DETOURS: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
  CLIENT_COMMENTS: [...HAPPY_PATH.slice(0, HAPPY_PATH.indexOf('CLIENT_REVIEW') + 1), 'CLIENT_COMMENTS'],
  REVISION: [...HAPPY_PATH.slice(0, HAPPY_PATH.indexOf('CLIENT_REVIEW') + 1), 'CLIENT_COMMENTS', 'REVISION'],
};

const PROJECT_NAMES: Record<ProjectStatus, string> = {
  DRAFT: 'Agence Tanger — brouillon de besoin',
  SUBMITTED: 'Entrepôt Kénitra — demande soumise',
  PENDING_ASSIGNMENT: 'Clinique Fès — en attente d’affectation',
  ASSIGNED: 'Lycée Meknès — équipe affectée',
  ENGINEERING: 'Usine Settat — dimensionnement',
  ARCHITECTURE: 'Nouveau siège Rabat — conception',
  INTERNAL_REVIEW: 'Campus Agadir — revue interne',
  COMMERCIAL_REVIEW: 'Hôtel Marrakech — chiffrage',
  CLIENT_REVIEW: 'Banque régionale Oujda — proposition client',
  CLIENT_COMMENTS: 'Centre d’appels Casablanca — commentaires client',
  REVISION: 'Laboratoire El Jadida — révision',
  CLIENT_APPROVED: 'Mairie Tétouan — validé par le client',
  COMPLETED: 'Data center Casablanca — terminé',
};

function pathTo(status: ProjectStatus): ProjectStatus[] {
  return DETOURS[status] ?? HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(status) + 1);
}

/** L'acteur de chaque pas est pris dans la table de transitions : l'historique est plausible. */
function actorFor(from: ProjectStatus, to: ProjectStatus, users: Record<Role, string>): { id: string; reverse: boolean } {
  const t = PROJECT_TRANSITIONS.find((x) => x.from === from && x.to === to);
  if (!t) throw new Error(`Transition absente de la table : ${from} -> ${to}`);
  return { id: users[t.roles[0] as Role], reverse: t.reverse === true };
}

async function reset(): Promise<void> {
  // Ordre inverse des dépendances.
  await prisma.auditLog.deleteMany();
  await prisma.architectureVersion.deleteMany();
  await prisma.architectureConnection.deleteMany();
  await prisma.architectureZone.deleteMany();
  await prisma.architectureElement.deleteMany();
  await prisma.architecture.deleteMany();
  await prisma.projectStatusHistory.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clientCompany.deleteMany();
  await prisma.equipmentModel.deleteMany();
  await prisma.equipmentBrand.deleteMany();
  await prisma.equipmentManufacturer.deleteMany();
  await prisma.equipmentCategory.deleteMany();
  await prisma.organization.deleteMany();
}

async function main(): Promise<void> {
  await reset();

  for (const code of EQUIPMENT_CATEGORIES) {
    await prisma.equipmentCategory.create({ data: { code, labelKey: `equipment.category.${code}` } });
  }

  const org = await prisma.organization.create({ data: { name: 'ArchiFlow Démo', slug: 'archiflow-demo' } });
  const rabat = await prisma.clientCompany.create({
    data: { organizationId: org.id, name: 'Groupe Atlas Services', city: 'Rabat', country: 'MA' },
  });
  await prisma.clientCompany.create({
    data: { organizationId: org.id, name: 'Maghreb Logistique', city: 'Casablanca', country: 'MA' },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = {} as Record<Role, string>;
  for (const account of ACCOUNTS) {
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        clientCompanyId: account.role === 'CLIENT' ? rabat.id : null,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        passwordHash,
        role: account.role,
      },
    });
    users[account.role] = user.id;
  }
  await prisma.clientProfile.create({
    data: { userId: users.CLIENT, jobTitle: 'Directeur des systèmes d’information' },
  });

  const day = 86_400_000;
  for (const [index, status] of PROJECT_STATUSES.entries()) {
    const steps = pathTo(status);
    const start = Date.now() - (steps.length + 2) * day;
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        clientCompanyId: rabat.id,
        name: PROJECT_NAMES[status],
        description: 'Projet de démonstration (DEMO DATA).',
        status,
        createdById: users.CLIENT,
        createdAt: new Date(start - index * 1000),
      },
    });
    // Équipe affectée dès que le projet a franchi l'étape d'affectation.
    if (steps.includes('ASSIGNED')) {
      for (const role of ['PROJECT_MANAGER', 'ENGINEER', 'ARCHITECT', 'SALES'] as const) {
        await prisma.projectAssignment.create({
          data: { organizationId: org.id, projectId: project.id, userId: users[role], role, assignedById: users.ADMIN },
        });
      }
    }
    for (let i = 1; i < steps.length; i++) {
      const from = steps[i - 1] as ProjectStatus;
      const to = steps[i] as ProjectStatus;
      const actor = actorFor(from, to, users);
      await prisma.projectStatusHistory.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          fromStatus: from,
          toStatus: to,
          actorId: actor.id,
          reason: actor.reverse ? 'Le client demande une redondance du lien Internet (démonstration).' : null,
          createdAt: new Date(start + i * day),
        },
      });
    }
  }

  console.log('Seed terminé.');
  console.log(`  Organisation : ${org.name}`);
  console.log(`  Comptes (mot de passe « ${DEMO_PASSWORD} ») :`);
  for (const a of ACCOUNTS) console.log(`    ${a.role.padEnd(16)} ${a.email}`);
  console.log(`  Projets : ${PROJECT_STATUSES.length}, un par statut du workflow.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
