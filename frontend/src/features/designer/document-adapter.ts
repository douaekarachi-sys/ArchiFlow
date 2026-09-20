import type {
  ArchitectureConnection,
  ArchitectureDocument,
  ArchitectureElement,
  ArchitectureZone,
  EquipmentCategory,
  LinkType,
  ZoneType,
} from '@archiflow/shared';
import type { Edge, Node } from '@xyflow/react';

export interface EquipmentNodeData extends Record<string, unknown> {
  category: EquipmentCategory;
  label: string;
  equipmentModelId: string | null;
  config: Record<string, unknown>;
  zoneId: string | null;
  /** Dénormalisé depuis la zone au moment de `toFlow` : évite au nœud de connaître la liste des zones. */
  zoneType: ZoneType | null;
}
export type EquipmentFlowNode = Node<EquipmentNodeData, 'equipment'>;

export interface ZoneNodeData extends Record<string, unknown> {
  zoneType: ZoneType;
  label: string;
}
export type ZoneFlowNode = Node<ZoneNodeData, 'zone'>;

export interface LabeledEdgeData extends Record<string, unknown> {
  linkType: LinkType;
  speedMbps?: number;
  protocol?: string;
  fromPort?: string;
  toPort?: string;
}
export type LabeledFlowEdge = Edge<LabeledEdgeData, 'labeled'>;

/** Une zone n'a pas encore de géométrie propre (v1) : le regroupement se lit sur les éléments. */
export interface DesignerZone {
  id: string;
  type: ZoneType;
  label?: string;
}

export type FlowNode = EquipmentFlowNode | ZoneFlowNode;

export interface FlowView {
  nodes: FlowNode[];
  edges: LabeledFlowEdge[];
  zones: DesignerZone[];
}

const zoneLabel = (type: ZoneType): string =>
  ({ DMZ: 'DMZ', LAN: 'LAN', WAN: 'WAN', REMOTE_SITE: 'Site distant' } as const)[type];

function zoneBounds(zone: ArchitectureZone, elementMap: Map<string, ArchitectureElement>) {
  const members = zone.elementIds
    .map((elementId) => elementMap.get(elementId))
    .filter((element): element is ArchitectureElement => element !== undefined);

  if (members.length === 0) {
    return { x: 0, y: 0, width: 260, height: 180 };
  }

  const positions = members.map((element) => ({ x: element.position.x, y: element.position.y }));
  const minX = Math.min(...positions.map((position) => position.x));
  const minY = Math.min(...positions.map((position) => position.y));
  const maxX = Math.max(...positions.map((position) => position.x));
  const maxY = Math.max(...positions.map((position) => position.y));

  const padX = 120;
  const padY = 110;
  const width = Math.max(260, maxX - minX + padX * 2);
  const height = Math.max(180, maxY - minY + padY * 2);

  return { x: minX - padX, y: minY - padY, width, height };
}

/**
 * React Flow est un moteur de rendu, jamais le modèle (ARCHITECTURE-CIBLE §6.8, principe 1).
 * `toFlow`/`fromFlow` sont la SEULE frontière entre le document `packages/shared` et sa
 * représentation d'édition ; aucun autre composant ne doit lire une forme de nœud/arête comme
 * si elle faisait foi — la sauvegarde et toute future fonctionnalité (BOM, PDF, 3D) lisent le
 * document, jamais `node.data`.
 */
export function toFlow(document: ArchitectureDocument): FlowView {
  const elementMap = new Map(document.elements.map((element) => [element.id, element]));
  const zoneByElementId = new Map<string, ArchitectureZone>();
  for (const zone of document.zones) {
    for (const elementId of zone.elementIds) zoneByElementId.set(elementId, zone);
  }

  const zoneNodes: ZoneFlowNode[] = document.zones.map((zone) => {
    const bounds = zoneBounds(zone, elementMap);
    return {
      id: `zone-${zone.id}`,
      type: 'zone',
      position: { x: bounds.x, y: bounds.y },
      data: {
        zoneType: zone.type,
        label: zone.label?.trim() || zoneLabel(zone.type),
      },
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      style: { width: bounds.width, height: bounds.height },
      zIndex: 0,
    } satisfies ZoneFlowNode;
  });

  const nodes: FlowNode[] = [
    ...document.elements.map((el): EquipmentFlowNode => ({
      id: el.id,
      type: 'equipment',
      position: el.position,
      data: {
        category: el.type,
        label: el.label,
        equipmentModelId: el.equipmentModelId,
        config: el.config,
        zoneId: zoneByElementId.get(el.id)?.id ?? null,
        zoneType: zoneByElementId.get(el.id)?.type ?? null,
      },
    })),
    ...zoneNodes,
  ];

  return {
    nodes,
    edges: document.connections.map((c) => ({
      id: c.id,
      type: 'labeled',
      source: c.from,
      target: c.to,
      data: { linkType: c.linkType, speedMbps: c.speedMbps, protocol: c.protocol, fromPort: c.fromPort, toPort: c.toPort },
    })),
    zones: document.zones.map((z) => ({ id: z.id, type: z.type, label: z.label })),
  };
}

/** Reconstruit le document depuis l'état d'édition courant — appelé à chaque point de commit. */
export function fromFlow(view: FlowView): ArchitectureDocument {
  const elements: ArchitectureElement[] = view.nodes
    .filter((node): node is EquipmentFlowNode => node.type === 'equipment')
    .map((n) => ({
      id: n.id,
      type: n.data.category,
      equipmentModelId: n.data.equipmentModelId,
      label: n.data.label,
      position: n.position,
      config: n.data.config,
    }));

  const connections: ArchitectureConnection[] = view.edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    linkType: e.data?.linkType ?? 'copper',
    speedMbps: e.data?.speedMbps,
    protocol: e.data?.protocol,
    fromPort: e.data?.fromPort,
    toPort: e.data?.toPort,
  }));

  const zones: ArchitectureZone[] = view.zones.map((zone) => ({
    id: zone.id,
    type: zone.type,
    label: zone.label,
    elementIds: view.nodes
      .filter((node): node is EquipmentFlowNode => node.type === 'equipment')
      .filter((n) => n.data.zoneId === zone.id)
      .map((n) => n.id),
  }));

  return { elements, connections, zones };
}
