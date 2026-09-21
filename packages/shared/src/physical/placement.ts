import type { ArchitectureDocument } from '../architecture/document.schema.js';
import type { Anomaly } from '../architecture/validation.js';

/**
 * Construction physique minimale (partie « schéma physique » d'EF-205) : bâtiment → étage →
 * salle → baie → position U. Fonction pure, zero I/O (ADR 0002) — mêmes règles en local (retour
 * immédiat, ADR 0003) et en revalidation serveur (fait autorité).
 *
 * La cohérence référentielle (baie/salle/étage/bâtiment connus) est un problème STRUCTUREL du
 * document, déjà couvert par `architectureDocumentSchema` (superRefine). Ici : la règle CROISÉE
 * entre plusieurs éléments — deux équipements ne peuvent pas occuper la même position U d'une
 * même baie — même répartition que `checkAddressing` pour le plan d'adressage.
 */
export function checkPlacement(document: ArchitectureDocument): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const rackById = new Map((document.racks ?? []).map((r) => [r.id, r]));
  const occupancy = new Map<string, string[]>();

  for (const element of document.elements) {
    const placement = element.placement;
    if (!placement?.rackId || placement.unit == null) continue;
    const rack = rackById.get(placement.rackId);
    if (rack && placement.unit > rack.totalUnits) {
      anomalies.push({
        severity: 'CRITICAL',
        code: 'validation.placement.unitOutOfRange',
        elementIds: [element.id],
        connectionIds: [],
        params: { unit: placement.unit, totalUnits: rack.totalUnits, rack: rack.name },
      });
      continue;
    }
    const key = `${placement.rackId}:${placement.unit}`;
    occupancy.set(key, [...(occupancy.get(key) ?? []), element.id]);
  }

  for (const [key, elementIds] of occupancy) {
    if (elementIds.length <= 1) continue;
    const [rackId, unit] = key.split(':');
    anomalies.push({
      severity: 'CRITICAL',
      code: 'validation.placement.rackUnitConflict',
      elementIds,
      connectionIds: [],
      params: { rack: rackById.get(rackId!)?.name ?? rackId!, unit: unit! },
    });
  }

  return anomalies;
}
