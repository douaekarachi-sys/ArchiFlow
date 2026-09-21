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

/**
 * Construction physique minimale (partie « schéma physique » d'EF-205) : bâtiment → étage →
 * salle → baie, dans le MÊME document que le reste (ADR 0001) — pas un second modèle. Pas de
 * câblage physique détaillé : seule la hiérarchie de localisation est couverte.
 */
export const buildingSchema = z.object({ id: z.string().min(1), name: z.string().min(1).max(120) });
export type Building = z.infer<typeof buildingSchema>;

export const floorSchema = z.object({
  id: z.string().min(1),
  /** Référence un `Building.id` du même document. */
  buildingId: z.string().min(1),
  name: z.string().min(1).max(120),
});
export type Floor = z.infer<typeof floorSchema>;

export const roomSchema = z.object({
  id: z.string().min(1),
  /** Référence un `Floor.id` du même document. */
  floorId: z.string().min(1),
  name: z.string().min(1).max(120),
});
export type Room = z.infer<typeof roomSchema>;

export const rackSchema = z.object({
  id: z.string().min(1),
  /** Référence un `Room.id` du même document. */
  roomId: z.string().min(1),
  name: z.string().min(1).max(120),
  /** Hauteur en U — 42U est la taille standard d'une baie 19" pleine hauteur. */
  totalUnits: z.number().int().min(1).max(60).default(42),
});
export type Rack = z.infer<typeof rackSchema>;

/** Implantation physique d'un élément. Absente tant qu'il n'est pas placé dans une baie. */
export const placementSchema = z.object({
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  roomId: z.string().optional(),
  /** Référence un `Rack.id` du même document. */
  rackId: z.string().optional(),
  /** Position U dans la baie — les chevauchements entre deux éléments sont détectés par `checkPlacement`. */
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

/**
 * Plan d'adressage IP/VLAN (EF-207, partie « plan d'adressage » d'EF-205).
 *
 * Le VLAN (bornes IEEE 802.1Q) est valide ICI, au format, des la saisie. Les chevauchements de
 * sous-reseaux et les conflits de VLAN sont des regles CROISEES entre plusieurs reseaux du meme
 * document : elles relevent du moteur d'anomalies (`checkAddressing`), pas de ce schema — meme
 * repartition que les moteurs de capacite/compatibilite (EF-202/203).
 */
export const ipNetworkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  vlanId: z.number().int().min(1).max(4094),
  cidr: z.string().min(1),
  gateway: z.string().optional(),
  dhcpRangeStart: z.string().optional(),
  dhcpRangeEnd: z.string().optional(),
});
export type IpNetwork = z.infer<typeof ipNetworkSchema>;

export const architectureElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(EQUIPMENT_CATEGORIES),
  equipmentModelId: z.string().uuid().nullable(),
  label: z.string().min(1).max(120),
  position: positionSchema,
  placement: placementSchema.optional(),
  /** Rattachement au plan d'adressage (EF-207) — reference un `IpNetwork.id` du meme document. */
  networkId: z.string().optional(),
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
    networks: z.array(ipNetworkSchema).optional(),
    buildings: z.array(buildingSchema).optional(),
    floors: z.array(floorSchema).optional(),
    rooms: z.array(roomSchema).optional(),
    racks: z.array(rackSchema).optional(),
  })
  .superRefine((doc, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    const elementIds = new Set<string>();
    doc.elements.forEach((el, i) => {
      if (elementIds.has(el.id)) issue(['elements', i, 'id'], `identifiant d'element duplique : ${el.id}`);
      elementIds.add(el.id);
    });

    const networkIds = new Set<string>();
    (doc.networks ?? []).forEach((network, i) => {
      if (networkIds.has(network.id)) issue(['networks', i, 'id'], `identifiant de reseau duplique : ${network.id}`);
      networkIds.add(network.id);
    });
    doc.elements.forEach((el, i) => {
      if (el.networkId && !networkIds.has(el.networkId)) {
        issue(['elements', i, 'networkId'], `element ${el.id} : reseau inconnu ${el.networkId}`);
      }
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

    // Construction physique (partie « schéma physique » d'EF-205) : bâtiment → étage → salle →
    // baie, chaque niveau référençant son parent par id, comme networks/zones ci-dessus.
    const buildingIds = new Set<string>();
    (doc.buildings ?? []).forEach((b, i) => {
      if (buildingIds.has(b.id)) issue(['buildings', i, 'id'], `identifiant de batiment duplique : ${b.id}`);
      buildingIds.add(b.id);
    });

    const floorIds = new Set<string>();
    (doc.floors ?? []).forEach((f, i) => {
      if (floorIds.has(f.id)) issue(['floors', i, 'id'], `identifiant d'etage duplique : ${f.id}`);
      floorIds.add(f.id);
      if (!buildingIds.has(f.buildingId)) issue(['floors', i, 'buildingId'], `etage ${f.id} : batiment inconnu ${f.buildingId}`);
    });

    const roomIds = new Set<string>();
    (doc.rooms ?? []).forEach((r, i) => {
      if (roomIds.has(r.id)) issue(['rooms', i, 'id'], `identifiant de salle duplique : ${r.id}`);
      roomIds.add(r.id);
      if (!floorIds.has(r.floorId)) issue(['rooms', i, 'floorId'], `salle ${r.id} : etage inconnu ${r.floorId}`);
    });

    const rackIds = new Set<string>();
    (doc.racks ?? []).forEach((rack, i) => {
      if (rackIds.has(rack.id)) issue(['racks', i, 'id'], `identifiant de baie duplique : ${rack.id}`);
      rackIds.add(rack.id);
      if (!roomIds.has(rack.roomId)) issue(['racks', i, 'roomId'], `baie ${rack.id} : salle inconnue ${rack.roomId}`);
    });

    doc.elements.forEach((el, i) => {
      const placement = el.placement;
      if (!placement) return;
      if (placement.buildingId && !buildingIds.has(placement.buildingId)) {
        issue(['elements', i, 'placement', 'buildingId'], `element ${el.id} : batiment inconnu ${placement.buildingId}`);
      }
      if (placement.floorId && !floorIds.has(placement.floorId)) {
        issue(['elements', i, 'placement', 'floorId'], `element ${el.id} : etage inconnu ${placement.floorId}`);
      }
      if (placement.roomId && !roomIds.has(placement.roomId)) {
        issue(['elements', i, 'placement', 'roomId'], `element ${el.id} : salle inconnue ${placement.roomId}`);
      }
      if (placement.rackId && !rackIds.has(placement.rackId)) {
        issue(['elements', i, 'placement', 'rackId'], `element ${el.id} : baie inconnue ${placement.rackId}`);
      }
    });
  });

export type ArchitectureDocument = z.infer<typeof architectureDocumentSchema>;

export const EMPTY_DOCUMENT: ArchitectureDocument = {
  elements: [],
  connections: [],
  zones: [],
};
