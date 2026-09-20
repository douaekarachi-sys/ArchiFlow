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

export interface FlowView {
  nodes: EquipmentFlowNode[];
  edges: LabeledFlowEdge[];
  zones: DesignerZone[];
}

/**
 * React Flow est un moteur de rendu, jamais le modèle (ARCHITECTURE-CIBLE §6.8, principe 1).
 * `toFlow`/`fromFlow` sont la SEULE frontière entre le document `packages/shared` et sa
 * représentation d'édition ; aucun autre composant ne doit lire une forme de nœud/arête comme
 * si elle faisait foi — la sauvegarde et toute future fonctionnalité (BOM, PDF, 3D) lisent le
 * document, jamais `node.data`.
 */
export function toFlow(document: ArchitectureDocument): FlowView {
  const zoneByElementId = new Map<string, ArchitectureZone>();
  for (const zone of document.zones) {
    for (const elementId of zone.elementIds) zoneByElementId.set(elementId, zone);
  }

  return {
    nodes: document.elements.map((el) => ({
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
  const elements: ArchitectureElement[] = view.nodes.map((n) => ({
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
    elementIds: view.nodes.filter((n) => n.data.zoneId === zone.id).map((n) => n.id),
  }));

  return { elements, connections, zones };
}
