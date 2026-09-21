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
  | { type: 'deleteNetwork'; networkId: string }
  | { type: 'addSite'; buildingName: string; floorName: string; roomName: string; rackName: string; totalUnits: number }
  | { type: 'deleteRack'; rackId: string }
  | { type: 'updateElementPlacement'; elementId: string; rackId: string | null; unit: number | null };

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

    // Construction physique (schéma physique d'EF-205) : crée la chaîne bâtiment → étage → salle
    // en réutilisant les niveaux déjà nommés (une seule baie par appel — la granularité qu'on attache).
    case 'addSite': {
      draft.buildings ??= [];
      draft.floors ??= [];
      draft.rooms ??= [];
      draft.racks ??= [];

      const buildingName = action.buildingName.trim();
      const floorName = action.floorName.trim();
      const roomName = action.roomName.trim();
      const rackName = action.rackName.trim();

      let building = draft.buildings.find((b) => b.name.toLowerCase() === buildingName.toLowerCase());
      if (!building) {
        building = { id: crypto.randomUUID(), name: buildingName };
        draft.buildings.push(building);
      }

      let floor = draft.floors.find((f) => f.buildingId === building!.id && f.name.toLowerCase() === floorName.toLowerCase());
      if (!floor) {
        floor = { id: crypto.randomUUID(), buildingId: building.id, name: floorName };
        draft.floors.push(floor);
      }

      let room = draft.rooms.find((r) => r.floorId === floor!.id && r.name.toLowerCase() === roomName.toLowerCase());
      if (!room) {
        room = { id: crypto.randomUUID(), floorId: floor.id, name: roomName };
        draft.rooms.push(room);
      }

      draft.racks.push({ id: crypto.randomUUID(), roomId: room.id, name: rackName, totalUnits: action.totalUnits });
      return;
    }

    case 'deleteRack':
      draft.racks = (draft.racks ?? []).filter((r) => r.id !== action.rackId);
      for (const element of draft.elements) {
        if (element.placement?.rackId === action.rackId) element.placement = undefined;
      }
      return;

    case 'updateElementPlacement': {
      const element = draft.elements.find((e) => e.id === action.elementId);
      if (!element) return;
      if (!action.rackId) {
        element.placement = undefined;
        return;
      }
      const rack = (draft.racks ?? []).find((r) => r.id === action.rackId);
      if (!rack) return;
      const room = (draft.rooms ?? []).find((r) => r.id === rack.roomId);
      const floor = room ? (draft.floors ?? []).find((f) => f.id === room.floorId) : undefined;
      const building = floor ? (draft.buildings ?? []).find((b) => b.id === floor.buildingId) : undefined;
      element.placement = {
        rackId: rack.id,
        roomId: room?.id,
        floorId: floor?.id,
        buildingId: building?.id,
        unit: action.unit ?? undefined,
      };
      return;
    }
  }
}
