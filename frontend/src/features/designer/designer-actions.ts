import type { ArchitectureConnection, ArchitectureDocument, ArchitectureElement, IpNetwork, ZoneType } from '@archiflow/shared';

export type DesignerAction =
  | { type: 'addElement'; element: ArchitectureElement }
  | { type: 'moveElement'; elementId: string; position: { x: number; y: number } }
  | { type: 'updateElementLabel'; elementId: string; label: string }
  | { type: 'updateElementZone'; elementId: string; zoneId: string | null }
  | { type: 'updateElementNetwork'; elementId: string; networkId: string | null }
  | { type: 'deleteElement'; elementId: string }
  | { type: 'addConnection'; connection: ArchitectureConnection }
  | { type: 'updateConnection'; connectionId: string; patch: Partial<Omit<ArchitectureConnection, 'id' | 'from' | 'to'>> }
  | { type: 'deleteConnection'; connectionId: string }
  | { type: 'addZone'; zoneId: string; zoneType: ZoneType; label?: string }
  | { type: 'renameZone'; zoneId: string; label: string }
  | { type: 'deleteZone'; zoneId: string }
  | { type: 'addNetwork'; network: IpNetwork }
  | { type: 'updateNetwork'; networkId: string; patch: Partial<Omit<IpNetwork, 'id'>> }
  | { type: 'deleteNetwork'; networkId: string };

/**
 * Reducer pur : la SEULE façon dont le document change (ARCHITECTURE-CIBLE §6.11, « toute
 * mutation passe par une couche de commandes »). Prévu pour `produceWithPatches` (Immer) — le
 * paramètre est un brouillon mutable, la fonction ne retourne rien.
 */
export function applyDesignerAction(draft: ArchitectureDocument, action: DesignerAction): void {
  switch (action.type) {
    case 'addElement':
      draft.elements.push(action.element);
      return;

    case 'moveElement': {
      const element = draft.elements.find((e) => e.id === action.elementId);
      if (element) element.position = action.position;
      return;
    }

    case 'updateElementLabel': {
      const element = draft.elements.find((e) => e.id === action.elementId);
      if (element) element.label = action.label;
      return;
    }

    case 'updateElementZone': {
      for (const zone of draft.zones) zone.elementIds = zone.elementIds.filter((id) => id !== action.elementId);
      if (action.zoneId) {
        const zone = draft.zones.find((z) => z.id === action.zoneId);
        zone?.elementIds.push(action.elementId);
      }
      return;
    }

    case 'deleteElement':
      draft.elements = draft.elements.filter((e) => e.id !== action.elementId);
      draft.connections = draft.connections.filter((c) => c.from !== action.elementId && c.to !== action.elementId);
      for (const zone of draft.zones) zone.elementIds = zone.elementIds.filter((id) => id !== action.elementId);
      return;

    case 'addConnection':
      draft.connections.push(action.connection);
      return;

    case 'updateConnection': {
      const connection = draft.connections.find((c) => c.id === action.connectionId);
      if (connection) Object.assign(connection, action.patch);
      return;
    }

    case 'deleteConnection':
      draft.connections = draft.connections.filter((c) => c.id !== action.connectionId);
      return;

    case 'addZone':
      draft.zones.push({ id: action.zoneId, type: action.zoneType, label: action.label, elementIds: [] });
      return;

    case 'renameZone': {
      const zone = draft.zones.find((z) => z.id === action.zoneId);
      if (zone) zone.label = action.label;
      return;
    }

    case 'deleteZone':
      // L'appartenance vit sur la zone (elementIds) : la supprimer suffit, rien à nettoyer côté élément.
      draft.zones = draft.zones.filter((z) => z.id !== action.zoneId);
      return;

    case 'updateElementNetwork': {
      const element = draft.elements.find((e) => e.id === action.elementId);
      if (element) element.networkId = action.networkId ?? undefined;
      return;
    }

    case 'addNetwork':
      draft.networks = [...(draft.networks ?? []), action.network];
      return;

    case 'updateNetwork': {
      const network = draft.networks?.find((n) => n.id === action.networkId);
      if (network) Object.assign(network, action.patch);
      return;
    }

    case 'deleteNetwork':
      draft.networks = (draft.networks ?? []).filter((n) => n.id !== action.networkId);
      for (const element of draft.elements) {
        if (element.networkId === action.networkId) element.networkId = undefined;
      }
      return;
  }
}
