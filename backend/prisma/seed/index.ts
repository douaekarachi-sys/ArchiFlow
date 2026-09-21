/**
 * Seed de démonstration — base de DÉVELOPPEMENT uniquement.
 *
 * Rejouable et destructif : il vide les tables avant de les remplir. Il refuse de s'exécuter
 * en production. Tous les comptes partagent un mot de passe de démonstration, affiché en fin
 * d'exécution ; ils ne doivent exister sur aucun environnement accessible depuis l'extérieur.
 *
 * Catalogue de démonstration : six fabricants réels, plusieurs modèles par catégorie, prix et
 * caractéristiques marqués `isDemoData`. Seed uniquement — ni schéma ni API n'en dépendent.
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

/**
 * Deux sociétés clientes supplémentaires (en plus de « Groupe Atlas Services », propriétaire du
 * scénario complet ci-dessous) : la démonstration doit prouver l'isolation entre sociétés
 * clientes d'un même locataire (D-09) à l'écran, pas seulement dans les tests. Chacune a son
 * propre compte CLIENT et ses propres projets — jamais partagés avec « Groupe Atlas Services ».
 */
const OTHER_CLIENT_ACCOUNTS: { email: string; firstName: string; lastName: string; jobTitle: string }[] = [
  { email: 'client2@archiflow.local', firstName: 'Sanae', lastName: 'Belmokhtar', jobTitle: 'Responsable infrastructure' },
  { email: 'client3@archiflow.local', firstName: 'Hicham', lastName: 'Ouazzani', jobTitle: 'Directeur technique' },
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

/** Un site par statut, sans suffixe de statut : la vraie information est le badge, pas le nom. */
const PROJECT_NAMES: Record<ProjectStatus, string> = {
  DRAFT: 'Agence Tanger',
  SUBMITTED: 'Entrepôt Kénitra',
  PENDING_ASSIGNMENT: 'Clinique Fès',
  ASSIGNED: 'Lycée Meknès',
  ENGINEERING: 'Usine Settat',
  ARCHITECTURE: 'Nouveau siège Rabat',
  INTERNAL_REVIEW: 'Campus Agadir',
  COMMERCIAL_REVIEW: 'Hôtel Marrakech',
  CLIENT_REVIEW: 'Banque régionale Oujda',
  CLIENT_COMMENTS: 'Centre d’appels Casablanca',
  REVISION: 'Laboratoire El Jadida',
  CLIENT_APPROVED: 'Mairie Tétouan',
  COMPLETED: 'Data center Casablanca',
};

interface ModelSeed {
  name: string;
  reference: string;
  category: (typeof EQUIPMENT_CATEGORIES)[number];
  description: string;
  portCount?: number;
  portType?: string;
  throughputMbps?: number;
  poeBudgetW?: number;
  powerDrawW?: number;
  rackUnits?: number;
  indicativePrice: number;
  licenseAnnualCost?: number;
}

interface ManufacturerSeed {
  manufacturer: string;
  website: string;
  models: ModelSeed[];
}

/** Catalogue de démonstration : six fabricants réels, prix et fiches fictifs (DEMO DATA). */
const CATALOG: ManufacturerSeed[] = [
  {
    manufacturer: 'Cisco',
    website: 'https://www.cisco.com',
    models: [
      { name: 'Catalyst 9300-48P', reference: 'C9300-48P-E', category: 'switch', description: 'Commutateur d’accès empilable 48 ports PoE+.', portCount: 48, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: 740, powerDrawW: 500, rackUnits: 1, indicativePrice: 68000 },
      { name: 'ISR 4331', reference: 'ISR4331/K9', category: 'router', description: 'Routeur de succursale, 3 ports WAN modulaires.', portCount: 3, portType: 'RJ45/SFP', throughputMbps: 100, powerDrawW: 60, rackUnits: 1, indicativePrice: 32000 },
      { name: 'Meraki MR46', reference: 'MR46-HW', category: 'access-point', description: 'Borne Wi-Fi 6 intérieure, gérée dans le cloud.', portCount: 1, portType: 'RJ45', throughputMbps: 2500, powerDrawW: 22, indicativePrice: 9500 },
    ],
  },
  {
    manufacturer: 'Aruba',
    website: 'https://www.arubanetworks.com',
    models: [
      { name: 'Aruba 6300M', reference: 'JL658A', category: 'switch', description: 'Commutateur de distribution 24 ports PoE+.', portCount: 24, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: 370, powerDrawW: 320, rackUnits: 1, indicativePrice: 41000 },
      { name: 'Aruba AP-535', reference: 'R4W35A', category: 'access-point', description: 'Borne Wi-Fi 6 double radio, usage dense.', portCount: 1, portType: 'RJ45', throughputMbps: 2400, powerDrawW: 25, indicativePrice: 8200 },
      { name: 'Aruba 7205', reference: 'JW738A', category: 'wifi-controller', description: 'Contrôleur Wi-Fi mobilité, jusqu’à 256 bornes.', portCount: 8, portType: 'SFP', throughputMbps: 40000, powerDrawW: 180, rackUnits: 1, indicativePrice: 95000, licenseAnnualCost: 8500 },
    ],
  },
  {
    manufacturer: 'Fortinet',
    website: 'https://www.fortinet.com',
    models: [
      { name: 'FortiGate 100F', reference: 'FG-100F', category: 'firewall', description: 'Pare-feu nouvelle génération, succursale.', portCount: 22, portType: 'RJ45/SFP', throughputMbps: 10000, powerDrawW: 46, rackUnits: 1, indicativePrice: 58000, licenseAnnualCost: 12000 },
      { name: 'FortiGate 60F', reference: 'FG-60F', category: 'firewall', description: 'Pare-feu petite agence, SD-WAN intégré.', portCount: 10, portType: 'RJ45', throughputMbps: 5000, powerDrawW: 30, rackUnits: 1, indicativePrice: 21000, licenseAnnualCost: 4500 },
      { name: 'FortiSwitch 124F', reference: 'FS-124F', category: 'switch', description: 'Commutateur d’accès géré par FortiGate, 24 ports PoE.', portCount: 24, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: 250, powerDrawW: 210, rackUnits: 1, indicativePrice: 27000 },
    ],
  },
  {
    manufacturer: 'HPE',
    website: 'https://www.hpe.com',
    models: [
      { name: 'ProLiant DL380 Gen11', reference: 'P52560-B21', category: 'server', description: 'Serveur rack biprocesseur polyvalent.', portCount: 4, portType: 'RJ45', powerDrawW: 800, rackUnits: 2, indicativePrice: 115000 },
      { name: 'ProLiant DL360 Gen11', reference: 'P51950-B21', category: 'server', description: 'Serveur rack 1U dense, virtualisation.', portCount: 4, portType: 'RJ45', powerDrawW: 500, rackUnits: 1, indicativePrice: 89000 },
      { name: 'Alletra 5000', reference: 'R0Q76A', category: 'storage', description: 'Baie de stockage hybride, réplication intégrée.', portCount: 8, portType: 'SFP+', rackUnits: 2, powerDrawW: 450, indicativePrice: 210000 },
      { name: 'R1500 G5 UPS', reference: 'AF446A', category: 'ups', description: 'Onduleur rack 1500 VA, autonomie 8 min en charge nominale.', rackUnits: 2, powerDrawW: 1500, indicativePrice: 18500 },
      { name: 'Baie 42U 1075mm', reference: 'BW909A', category: 'rack', description: 'Armoire rack 42U, ventilation avant/arrière.', rackUnits: 42, indicativePrice: 24000 },
    ],
  },
  {
    manufacturer: 'Dell',
    website: 'https://www.dell.com',
    models: [
      { name: 'PowerEdge R650', reference: 'R650-XS', category: 'server', description: 'Serveur rack 1U, cœur de datacenter.', portCount: 4, portType: 'RJ45', powerDrawW: 550, rackUnits: 1, indicativePrice: 92000 },
      { name: 'PowerEdge R750', reference: 'R750-XL', category: 'server', description: 'Serveur rack 2U, charges GPU et virtualisation.', portCount: 4, portType: 'RJ45', powerDrawW: 850, rackUnits: 2, indicativePrice: 128000 },
      { name: 'PowerVault ME5024', reference: 'ME5024', category: 'storage', description: 'Baie de stockage SAN, 24 emplacements.', portCount: 8, portType: 'SFP+', rackUnits: 2, powerDrawW: 400, indicativePrice: 185000 },
      { name: 'OptiPlex 7020 Micro', reference: '7020-MFF', category: 'workstation', description: 'Poste client compact, usage bureautique.', portCount: 1, portType: 'RJ45', powerDrawW: 65, indicativePrice: 9800 },
      { name: 'NetShelter Load Balancer 5000', reference: 'DLB-5000', category: 'load-balancer', description: 'Répartiteur de charge matériel, deux liens WAN.', portCount: 8, portType: 'RJ45/SFP', throughputMbps: 10000, powerDrawW: 120, rackUnits: 1, indicativePrice: 76000 },
    ],
  },
  {
    manufacturer: 'Lenovo',
    website: 'https://www.lenovo.com',
    models: [
      { name: 'ThinkSystem SR630', reference: '7Y51-SR630', category: 'server', description: 'Serveur rack 1U, densité de calcul.', portCount: 4, portType: 'RJ45', powerDrawW: 530, rackUnits: 1, indicativePrice: 87000 },
      { name: 'ThinkSystem SR650', reference: '7Y52-SR650', category: 'server', description: 'Serveur rack 2U, stockage local étendu.', portCount: 4, portType: 'RJ45', powerDrawW: 820, rackUnits: 2, indicativePrice: 121000 },
      { name: 'ThinkCentre M90t', reference: 'M90T-G4', category: 'workstation', description: 'Poste client tour, configuration technique.', portCount: 1, portType: 'RJ45', powerDrawW: 90, indicativePrice: 11200 },
    ],
  },
];

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

  const categoryIds: Record<string, string> = {};
  for (const code of EQUIPMENT_CATEGORIES) {
    const category = await prisma.equipmentCategory.create({ data: { code, labelKey: `equipment.category.${code}` } });
    categoryIds[code] = category.id;
  }

  const org = await prisma.organization.create({ data: { name: 'ArchiFlow Démo', slug: 'archiflow-demo' } });
  const rabat = await prisma.clientCompany.create({
    data: { organizationId: org.id, name: 'Groupe Atlas Services', city: 'Rabat', country: 'MA' },
  });
  const casablanca = await prisma.clientCompany.create({
    data: { organizationId: org.id, name: 'Maghreb Logistique', city: 'Casablanca', country: 'MA' },
  });
  const tanger = await prisma.clientCompany.create({
    data: { organizationId: org.id, name: 'Atlas Négoce', city: 'Tanger', country: 'MA' },
  });

  let modelCount = 0;
  for (const entry of CATALOG) {
    const manufacturer = await prisma.equipmentManufacturer.create({
      data: { organizationId: org.id, name: entry.manufacturer, website: entry.website },
    });
    const brand = await prisma.equipmentBrand.create({
      data: { organizationId: org.id, manufacturerId: manufacturer.id, name: entry.manufacturer },
    });
    for (const model of entry.models) {
      await prisma.equipmentModel.create({
        data: {
          organizationId: org.id,
          brandId: brand.id,
          categoryId: categoryIds[model.category]!,
          name: model.name,
          reference: model.reference,
          description: model.description,
          portCount: model.portCount,
          portType: model.portType,
          throughputMbps: model.throughputMbps,
          poeBudgetW: model.poeBudgetW,
          powerDrawW: model.powerDrawW,
          rackUnits: model.rackUnits,
          indicativePrice: model.indicativePrice,
          currency: 'MAD',
          licenseAnnualCost: model.licenseAnnualCost,
          isDemoData: true,
        },
      });
      modelCount++;
    }
  }

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

  /**
   * Crée les projets d'une société cliente, avec un historique de transitions plausible.
   * `clientUserId` remplace `users.CLIENT` pour les transitions dont l'acteur est le client
   * (soumission, approbation…) : chaque société avance SES projets avec SON compte, jamais
   * celui d'une autre — c'est justement ce que la démonstration doit rendre visible à l'écran.
   */
  async function seedCompanyProjects(
    clientCompanyId: string,
    clientUserId: string,
    projects: { status: ProjectStatus; name: string }[],
    dateOffsetDays: number,
  ): Promise<void> {
    const actorUsers = { ...users, CLIENT: clientUserId };
    for (const [index, { status, name }] of projects.entries()) {
      const steps = pathTo(status);
      const start = Date.now() - (steps.length + 2 + dateOffsetDays) * day;
      const project = await prisma.project.create({
        data: {
          organizationId: org.id,
          clientCompanyId,
          name,
          description: 'Projet de démonstration (DEMO DATA).',
          status,
          createdById: clientUserId,
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
        const actor = actorFor(from, to, actorUsers);
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
  }

  // Société 1 — scénario complet : un projet par statut du workflow (chemin nominal + détours).
  await seedCompanyProjects(
    rabat.id,
    users.CLIENT,
    PROJECT_STATUSES.map((status) => ({ status, name: PROJECT_NAMES[status] })),
    0,
  );

  // Sociétés 2 et 3 — chacune avec son propre compte CLIENT et ses propres projets, JAMAIS ceux
  // de « Groupe Atlas Services » : c'est ce qui rend l'isolation entre sociétés clientes visible
  // à l'écran (D-09), pas seulement prouvée par les tests d'intégration.
  const [client2, client3] = OTHER_CLIENT_ACCOUNTS;
  const clientUserId2 = await prisma.user
    .create({
      data: {
        organizationId: org.id,
        clientCompanyId: casablanca.id,
        email: client2!.email,
        firstName: client2!.firstName,
        lastName: client2!.lastName,
        passwordHash,
        role: 'CLIENT',
      },
    })
    .then((u) => u.id);
  await prisma.clientProfile.create({ data: { userId: clientUserId2, jobTitle: client2!.jobTitle } });
  await seedCompanyProjects(
    casablanca.id,
    clientUserId2,
    [
      { status: 'SUBMITTED', name: 'Entrepôt Nouaceur' },
      { status: 'ENGINEERING', name: 'Plateforme Zenata' },
    ],
    1,
  );

  const clientUserId3 = await prisma.user
    .create({
      data: {
        organizationId: org.id,
        clientCompanyId: tanger.id,
        email: client3!.email,
        firstName: client3!.firstName,
        lastName: client3!.lastName,
        passwordHash,
        role: 'CLIENT',
      },
    })
    .then((u) => u.id);
  await prisma.clientProfile.create({ data: { userId: clientUserId3, jobTitle: client3!.jobTitle } });
  await seedCompanyProjects(
    tanger.id,
    clientUserId3,
    [
      { status: 'DRAFT', name: 'Boutique Tanger Med' },
      { status: 'CLIENT_REVIEW', name: 'Show-room Tétouan' },
    ],
    2,
  );

  console.log('Seed terminé.');
  console.log(`  Organisation : ${org.name}`);
  console.log(`  Comptes (mot de passe « ${DEMO_PASSWORD} ») :`);
  for (const a of ACCOUNTS) console.log(`    ${a.role.padEnd(16)} ${a.email}  (${rabat.name})`);
  console.log(`    CLIENT           ${client2!.email}  (${casablanca.name})`);
  console.log(`    CLIENT           ${client3!.email}  (${tanger.name})`);
  console.log(
    `  Projets : ${PROJECT_STATUSES.length + 4} — ${PROJECT_STATUSES.length} pour ${rabat.name} (un par statut du workflow), 2 pour ${casablanca.name}, 2 pour ${tanger.name}.`,
  );
  console.log(`  Sociétés clientes : ${rabat.name}, ${casablanca.name}, ${tanger.name} — chacune isolée (D-09).`);
  console.log(`  Catalogue : ${CATALOG.length} fabricants, ${modelCount} modèles (DEMO DATA).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
