import type { ArchitectureDocument } from './document.schema.js';

/**
 * Comparaison semantique entre deux versions (EF-405) : par categorie d'equipement, jamais un
 * diff textuel brut. Fonction pure (ADR 0002), comparee par identifiant d'element stable —
 * deplacer un element ne compte pour rien, le remplacer par un modele different compte comme
 * une modification.
 */

export interface ArchitectureDiffCategoryChange {
  category: string;
  added: number;
  removed: number;
  changed: number;
}

export interface ArchitectureDiff {
  elements: ArchitectureDiffCategoryChange[];
  connectionsAdded: number;
  connectionsRemoved: number;
  zonesAdded: number;
  zonesRemoved: number;
}

export function diffArchitecture(from: ArchitectureDocument, to: ArchitectureDocument): ArchitectureDiff {
  const fromById = new Map(from.elements.map((e) => [e.id, e]));
  const toById = new Map(to.elements.map((e) => [e.id, e]));

  const counts = new Map<string, ArchitectureDiffCategoryChange>();
  const bump = (category: string, field: 'added' | 'removed' | 'changed') => {
    const entry = counts.get(category) ?? { category, added: 0, removed: 0, changed: 0 };
    entry[field] += 1;
    counts.set(category, entry);
  };

  for (const el of to.elements) {
    if (!fromById.has(el.id)) bump(el.type, 'added');
  }
  for (const el of from.elements) {
    if (!toById.has(el.id)) bump(el.type, 'removed');
  }
  for (const el of to.elements) {
    const prior = fromById.get(el.id);
    if (prior && prior.equipmentModelId !== el.equipmentModelId) bump(el.type, 'changed');
  }

  const elements = [...counts.values()]
    .filter((c) => c.added > 0 || c.removed > 0 || c.changed > 0)
    .sort((a, b) => a.category.localeCompare(b.category));

  const fromConnIds = new Set(from.connections.map((c) => c.id));
  const toConnIds = new Set(to.connections.map((c) => c.id));
  const fromZoneIds = new Set(from.zones.map((z) => z.id));
  const toZoneIds = new Set(to.zones.map((z) => z.id));

  return {
    elements,
    connectionsAdded: to.connections.filter((c) => !fromConnIds.has(c.id)).length,
    connectionsRemoved: from.connections.filter((c) => !toConnIds.has(c.id)).length,
    zonesAdded: to.zones.filter((z) => !fromZoneIds.has(z.id)).length,
    zonesRemoved: from.zones.filter((z) => !toZoneIds.has(z.id)).length,
  };
}

export function isArchitectureDiffEmpty(diff: ArchitectureDiff): boolean {
  return diff.elements.length === 0 && diff.connectionsAdded === 0 && diff.connectionsRemoved === 0 && diff.zonesAdded === 0 && diff.zonesRemoved === 0;
}
