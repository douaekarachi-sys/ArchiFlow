/**
 * Filet d'isolation multi-organisations (ADR 0006, niveau 3).
 *
 * Les services métier interrogent la base par le client « tenant », auquel cette règle est
 * attachée : toute requête sur un modèle appartenant à un locataire DOIT porter
 * `organizationId`. Un oubli de développeur devient une exception bruyante, jamais une fuite
 * silencieuse entre locataires.
 */

/** Modèles portant `organizationId` et dont la lecture doit toujours être filtrée. */
export const ORG_SCOPED_MODELS: ReadonlySet<string> = new Set([
  'ClientCompany',
  'User',
  'Project',
  'ProjectAssignment',
  'ProjectShare',
  'ProjectStatusHistory',
  'EquipmentManufacturer',
  'EquipmentBrand',
  'EquipmentModel',
  'Architecture',
  'ArchitectureElement',
  'ArchitectureConnection',
  'ArchitectureZone',
  'ArchitectureNetwork',
  'ArchitectureBuilding',
  'ArchitectureFloor',
  'ArchitectureRoom',
  'ArchitectureRack',
  'ArchitectureVersion',
  'ProjectRequest',
  'RequestBuilding',
  'RequestDepartment',
  'ProjectComment',
]);

const WHERE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);

const CREATE_OPERATIONS = new Set(['create', 'createMany', 'createManyAndReturn']);

export class OrgScopeViolation extends Error {
  constructor(model: string, operation: string) {
    super(`Requête ${model}.${operation} sans filtre organizationId : refusée par le filet d'isolation`);
    this.name = 'OrgScopeViolation';
  }
}

type Args = Record<string, unknown> | undefined;

function hasOrgFilter(where: unknown): boolean {
  if (where === null || typeof where !== 'object') return false;
  const w = where as Record<string, unknown>;
  if (w['organizationId'] !== undefined) return true;
  const and = w['AND'];
  if (Array.isArray(and)) return and.some(hasOrgFilter);
  return hasOrgFilter(and);
}

function hasOrgData(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0 && data.every(hasOrgData);
  if (data === null || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d['organizationId'] === 'string' || d['organization'] !== undefined;
}

export function assertOrgScoped(model: string | undefined, operation: string, args: Args): void {
  if (!model || !ORG_SCOPED_MODELS.has(model)) return;
  if (WHERE_OPERATIONS.has(operation) && !hasOrgFilter(args?.['where'])) {
    throw new OrgScopeViolation(model, operation);
  }
  if (CREATE_OPERATIONS.has(operation) && !hasOrgData(args?.['data'])) {
    throw new OrgScopeViolation(model, operation);
  }
}
