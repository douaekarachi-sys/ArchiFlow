import { z } from 'zod';

/**
 * Le document d'architecture : une donnee structuree, jamais une image.
 *
 * Cette forme est le CONTRAT D'API et le format du snapshot JSONB (ADR 0001). Les tables
 * normalisees ArchitectureElement / ArchitectureConnection / ArchitectureZone en sont la
 * persistance de travail. Un meme document alimente le rendu 2D, le rendu 3D, les moteurs de
 * capacite et de compatibilite, le BOM, les couts et le PDF.
 *
 * Le schema est defini ICI et nulle part ailleurs ; les types sont derives par z.infer.
 */

export const EQUIPMENT_CATEGORIES = [
  'firewall',
  'router',
  'switch',
  'access-point',
  'wifi-controller',
  'server',
  'storage',
  'load-balancer',
  'ups',
  'rack',
  /** « Postes clients » d'EF-101. */
  'workstation',
  'internet',
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const ZONE_TYPES = ['DMZ', 'LAN', 'WAN', 'REMOTE_SITE'] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

export const LINK_TYPES = ['copper', 'fiber', 'wireless', 'virtual'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/** Implantation physique. Absente tant que l'element n'est pas place (Phase 6). */
export const placementSchema = z.object({
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  roomId: z.string().optional(),
  rackId: z.string().optional(),
  unit: z.number().int().min(1).max(60).optional(),
});

/**
 * Caracteristiques figees au moment de la sauvegarde (ADR 0001).
 *
 * Motif metier : les prix evoluent. Regenerer le BOM d'une version validee doit redonner le
 * chiffrage validee a l'epoque, pas celui d'aujourd'hui. Sans ce figeage, une proposition
 * acceptee par un client deviendrait irreproductible des la premiere mise a jour du catalogue.
 */
export const frozenModelSpecSchema = z.object({
  name: z.string(),
  reference: z.string(),
  portCount: z.number().int().min(0).optional(),
  throughputMbps: z.number().int().min(0).optional(),
  rackUnits: z.number().int().min(0).optional(),
  poeBudgetW: z.number().int().min(0).optional(),
  powerDrawW: z.number().int().min(0).optional(),
  indicativePrice: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  /** Coût de licence/support ANNUEL figé au moment du gel (EF-303) — distinct du prix matériel. */
  licenseAnnualCost: z.number().min(0).optional(),
});
export type FrozenModelSpec = z.infer<typeof frozenModelSpecSchema>;

export const architectureElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(EQUIPMENT_CATEGORIES),
  equipmentModelId: z.string().uuid().nullable(),
  label: z.string().min(1).max(120),
  position: positionSchema,
  placement: placementSchema.optional(),
  config: z.record(z.unknown()).default({}),
  /** Present dans un snapshot, absent dans la version de travail. */
  frozenSpec: frozenModelSpecSchema.optional(),
});
export type ArchitectureElement = z.infer<typeof architectureElementSchema>;

export const architectureConnectionSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  fromPort: z.string().optional(),
  to: z.string().min(1),
  toPort: z.string().optional(),
  linkType: z.enum(LINK_TYPES),
  speedMbps: z.number().int().min(0).optional(),
  protocol: z.string().optional(),
});
export type ArchitectureConnection = z.infer<typeof architectureConnectionSchema>;

export const architectureZoneSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ZONE_TYPES),
  label: z.string().max(120).optional(),
  elementIds: z.array(z.string()).default([]),
});
export type ArchitectureZone = z.infer<typeof architectureZoneSchema>;

export const architectureDocumentSchema = z
  .object({
    elements: z.array(architectureElementSchema).default([]),
    connections: z.array(architectureConnectionSchema).default([]),
    zones: z.array(architectureZoneSchema).default([]),
  })
  .superRefine((doc, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    const elementIds = new Set<string>();
    doc.elements.forEach((el, i) => {
      if (elementIds.has(el.id)) issue(['elements', i, 'id'], `identifiant d'element duplique : ${el.id}`);
      elementIds.add(el.id);
    });

    const connectionIds = new Set<string>();
    doc.connections.forEach((conn, i) => {
      if (connectionIds.has(conn.id)) {
        issue(['connections', i, 'id'], `identifiant de connexion duplique : ${conn.id}`);
      }
      connectionIds.add(conn.id);
      if (!elementIds.has(conn.from)) {
        issue(['connections', i, 'from'], `connexion ${conn.id} : element source inconnu ${conn.from}`);
      }
      if (!elementIds.has(conn.to)) {
        issue(['connections', i, 'to'], `connexion ${conn.id} : element cible inconnu ${conn.to}`);
      }
      // Une connexion d'un element vers lui-meme n'a pas de sens physique ; deux ports d'un
      // meme equipement relies entre eux relevent d'une boucle, detectee en Phase 7.
      if (conn.from === conn.to) {
        issue(['connections', i], `connexion ${conn.id} : un element ne peut pas etre relie a lui-meme`);
      }
    });

    const zoneIds = new Set<string>();
    doc.zones.forEach((zone, i) => {
      if (zoneIds.has(zone.id)) issue(['zones', i, 'id'], `identifiant de zone duplique : ${zone.id}`);
      zoneIds.add(zone.id);
      zone.elementIds.forEach((elementId, j) => {
        if (!elementIds.has(elementId)) {
          issue(['zones', i, 'elementIds', j], `zone ${zone.id} : element inconnu ${elementId}`);
        }
      });
    });
  });

export type ArchitectureDocument = z.infer<typeof architectureDocumentSchema>;

export const EMPTY_DOCUMENT: ArchitectureDocument = {
  elements: [],
  connections: [],
  zones: [],
};
