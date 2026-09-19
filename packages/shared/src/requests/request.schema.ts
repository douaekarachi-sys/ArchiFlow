import { z } from 'zod';

/**
 * Expression du besoin client (EF-507). Le langage est celui du client — bâtiments, employés,
 * Wi-Fi — jamais celui du catalogue. L'ingénieur transforme ensuite ce besoin en solution.
 *
 * Deux niveaux de validation :
 * - brouillon : presque tout est optionnel (reprise après interruption) ;
 * - soumission : un nom et au moins une expression de besoin (canSubmitNeed).
 */

export const PROJECT_TYPES = [
  'new_headquarters',
  'new_site',
  'expansion',
  'refresh',
  'datacenter',
  'multi_site',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const VENDOR_PREFERENCES = [
  'cisco',
  'aruba',
  'fortinet',
  'hpe',
  'dell',
  'lenovo',
  'no_preference',
] as const;
export type VendorPreference = (typeof VENDOR_PREFERENCES)[number];

export const REQUEST_STEPS = [
  'general',
  'buildings',
  'workforce',
  'departments',
  'servers',
  'network',
  'security',
  'vendors',
] as const;
export type RequestStep = (typeof REQUEST_STEPS)[number];

const intField = (max: number) => z.number().int().min(0).max(max).nullable().optional();
const textField = (max: number) => z.string().trim().max(max).nullable().optional();
const flag = z.boolean().nullable().optional();

export const requestBuildingSchema = z.object({
  name: z.string().trim().max(120).default(''),
  areaM2: z.number().min(0).max(10_000_000).nullable().optional(),
  floors: intField(200),
  description: textField(1000),
});
export type RequestBuildingInput = z.infer<typeof requestBuildingSchema>;

export const requestDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'validation.name.required').max(80),
  employees: intField(100_000),
  workstations: intField(100_000),
  location: textField(120),
  notes: textField(500),
});
export type RequestDepartmentInput = z.infer<typeof requestDepartmentSchema>;

export const requestNeedSchema = z.object({
  location: textField(200),
  projectType: z.enum(PROJECT_TYPES).nullable().optional(),
  siteCount: intField(500),
  totalEmployees: intField(1_000_000),
  workstationCount: intField(1_000_000),
  concurrentUsers: intField(1_000_000),
  buildings: z.array(requestBuildingSchema).max(50).default([]),
  departments: z.array(requestDepartmentSchema).max(40).default([]),
  serverCount: intField(10_000),
  serverPhysical: flag,
  serverVirtual: flag,
  storageNeed: textField(500),
  backupNeed: textField(500),
  virtualization: textField(200),
  highAvailability: flag,
  serverNotes: textField(2000),
  wifi: flag,
  wifiApCount: intField(10_000),
  voip: flag,
  cctv: flag,
  printers: flag,
  iot: flag,
  internetAccess: flag,
  vpn: flag,
  remoteSites: flag,
  dmz: flag,
  lan: flag,
  wan: flag,
  networkNotes: textField(2000),
  firewall: flag,
  idsIps: flag,
  segmentation: flag,
  vlan: flag,
  accessControl: flag,
  haSecurity: flag,
  securityNotes: textField(2000),
  vendors: z.array(z.enum(VENDOR_PREFERENCES)).max(10).default([]),
  vendorNotes: textField(1000),
  freeTextNeed: textField(4000),
});
export type RequestNeed = z.infer<typeof requestNeedSchema>;

export const EMPTY_NEED: RequestNeed = requestNeedSchema.parse({});

/** Création : un nom de projet suffit ; le reste se complète dans le wizard. */
export const createRequestSchema = requestNeedSchema.extend({
  name: z.string().trim().min(3, 'validation.projectName.required').max(120),
  description: textField(2000),
  clientCompanyId: z.string().uuid().nullish(),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

/** Sauvegarde de brouillon : le nom peut rester tel quel (envoyé à chaque sauvegarde). */
export const updateRequestSchema = requestNeedSchema.extend({
  name: z.string().trim().min(3, 'validation.projectName.required').max(120).optional(),
  description: textField(2000),
});
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

export const commentBodySchema = z.object({
  body: z.string().trim().min(1, 'validation.comment.required').max(2000),
});
export type CommentBodyInput = z.infer<typeof commentBodySchema>;

const filled = (value: string | null | undefined) => (value ?? '').trim().length > 0;
const positive = (value: number | null | undefined) => (value ?? 0) > 0;
const flagged = (value: boolean | null | undefined) => value === true;

/**
 * Un besoin « exprimable » : le client n'est pas obligé de connaître le matériel.
 * « Je veux du Wi-Fi pour 200 employés » suffit.
 */
export function canSubmitNeed(need: {
  name?: string | null;
  totalEmployees?: number | null;
  workstationCount?: number | null;
  serverCount?: number | null;
  wifi?: boolean | null;
  freeTextNeed?: string | null;
  buildings?: readonly { name?: string }[];
}): boolean {
  if ((need.name ?? '').trim().length < 3) return false;
  return (
    positive(need.totalEmployees) ||
    positive(need.workstationCount) ||
    positive(need.serverCount) ||
    flagged(need.wifi) ||
    (need.freeTextNeed ?? '').trim().length >= 10 ||
    (need.buildings ?? []).some((b) => (b.name ?? '').trim().length > 0)
  );
}

export function requestStepDone(step: RequestStep, need: RequestNeed): boolean {
  switch (step) {
    case 'general':
      return filled(need.location) || need.projectType != null || (need.siteCount ?? 0) > 0;
    case 'buildings':
      return need.buildings.some((b) => filled(b.name) || positive(b.areaM2) || positive(b.floors));
    case 'workforce':
      return positive(need.totalEmployees) || positive(need.workstationCount) || positive(need.concurrentUsers);
    case 'departments':
      return need.departments.some((d) => filled(d.name));
    case 'servers':
      return (
        positive(need.serverCount) ||
        flagged(need.serverPhysical) ||
        flagged(need.serverVirtual) ||
        filled(need.storageNeed) ||
        filled(need.backupNeed) ||
        filled(need.serverNotes)
      );
    case 'network':
      return (
        flagged(need.wifi) ||
        flagged(need.voip) ||
        flagged(need.cctv) ||
        flagged(need.vpn) ||
        flagged(need.lan) ||
        flagged(need.wan) ||
        flagged(need.dmz) ||
        flagged(need.internetAccess) ||
        filled(need.networkNotes)
      );
    case 'security':
      return (
        flagged(need.firewall) ||
        flagged(need.idsIps) ||
        flagged(need.segmentation) ||
        flagged(need.vlan) ||
        flagged(need.accessControl) ||
        flagged(need.haSecurity) ||
        filled(need.securityNotes)
      );
    case 'vendors':
      return need.vendors.length > 0 || filled(need.vendorNotes) || filled(need.freeTextNeed);
  }
}

export function requestProgress(need: RequestNeed): { done: number; total: number } {
  const done = REQUEST_STEPS.filter((step) => requestStepDone(step, need)).length;
  return { done, total: REQUEST_STEPS.length };
}

export interface RequestSummary {
  buildingCount: number;
  totalAreaM2: number;
  totalEmployees: number | null;
  workstationCount: number | null;
  serverCount: number | null;
  wifi: boolean;
  voip: boolean;
  vpn: boolean;
}

export function summarizeNeed(need: Pick<RequestNeed, 'buildings' | 'totalEmployees' | 'workstationCount' | 'serverCount' | 'wifi' | 'voip' | 'vpn'>): RequestSummary {
  return {
    buildingCount: need.buildings.filter((b) => filled(b.name) || positive(b.areaM2)).length,
    totalAreaM2: need.buildings.reduce((sum, b) => sum + (b.areaM2 ?? 0), 0),
    totalEmployees: need.totalEmployees ?? null,
    workstationCount: need.workstationCount ?? null,
    serverCount: need.serverCount ?? null,
    wifi: need.wifi === true,
    voip: need.voip === true,
    vpn: need.vpn === true,
  };
}
