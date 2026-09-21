import { checkAddressing } from '../network/addressing.js';
import { checkPlacement } from '../physical/placement.js';
import type { ArchitectureDocument } from './document.schema.js';

/**
 * Moteurs de capacite (EF-202), compatibilite (EF-203) et detection d'anomalies (EF-204).
 *
 * Fonctions pures, zero I/O (ADR 0002) : le meme code s'execute cote client, a chaque
 * glisser-depose pour un retour immediat (ADR 0003, < 50 ms), et cote serveur, qui fait
 * autorite a la sauvegarde. Les caracteristiques des modeles ne sont PAS dans le document de
 * travail (elles ne vivent que dans les snapshots, ADR 0001) : l'appelant fournit un index
 * construit depuis le catalogue.
 */

/** Caracteristiques d'un modele necessaires aux calculs — sous-ensemble d'EquipmentModel. */
export interface EquipmentSpec {
  portCount: number | null;
  portType: string | null;
  throughputMbps: number | null;
  poeBudgetW: number | null;
  powerDrawW: number | null;
}

export type EquipmentIndex = Record<string, EquipmentSpec>;

export type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

/**
 * `code` est une cle i18n stable, jamais un message en dur (ENF-03) : le frontend et le
 * backend la traduisent, chacun dans sa langue d'affichage.
 */
export interface Anomaly {
  severity: AnomalySeverity;
  code: string;
  elementIds: string[];
  connectionIds: string[];
  params?: Record<string, string | number>;
}

export interface ValidationResult {
  anomalies: Anomaly[];
  /** Aucune anomalie CRITICAL : une conception incompatible ne l'est jamais « un peu ». */
  compatible: boolean;
}

const FIBER_PORT_HINTS = ['sfp', 'fibre', 'fiber'];
const WIRELESS_CATEGORIES = new Set(['access-point', 'wifi-controller', 'workstation']);
/** Categories dont l'isolement réseau est normal (alimentation, structure) : pas une anomalie. */
const NON_NETWORKED_CATEGORIES = new Set(['ups', 'rack']);

function specOf(index: EquipmentIndex, equipmentModelId: string | null): EquipmentSpec | null {
  return equipmentModelId ? (index[equipmentModelId] ?? null) : null;
}

/** EF-202 — capacite : ports physiquement disponibles, budget PoE, modeles non renseignes. */
export function checkCapacity(document: ArchitectureDocument, index: EquipmentIndex): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const connectionCountByElement = new Map<string, number>();
  const poeDrawByElement = new Map<string, number>();

  for (const connection of document.connections) {
    connectionCountByElement.set(connection.from, (connectionCountByElement.get(connection.from) ?? 0) + 1);
    connectionCountByElement.set(connection.to, (connectionCountByElement.get(connection.to) ?? 0) + 1);
  }

  for (const element of document.elements) {
    const spec = specOf(index, element.equipmentModelId);

    if (!spec) {
      const isConnected = document.connections.some((connection) => connection.from === element.id || connection.to === element.id);
      if (element.type !== 'internet' && !isConnected) {
        anomalies.push({ severity: 'INFO', code: 'validation.capacity.unsizedModel', elementIds: [element.id], connectionIds: [] });
      }
      continue;
    }

    const used = connectionCountByElement.get(element.id) ?? 0;
    if (spec.portCount != null && used > spec.portCount) {
      anomalies.push({
        severity: 'CRITICAL',
        code: 'validation.capacity.portOverflow',
        elementIds: [element.id],
        connectionIds: [],
        params: { used, capacity: spec.portCount },
      });
    }

    if (spec.poeBudgetW != null) {
      const draw = poeDrawByElement.get(element.id) ?? 0;
      poeDrawByElement.set(element.id, draw);
    }
  }

  // Le budget PoE d'un commutateur alimente les equipements qui lui sont directement relies.
  for (const connection of document.connections) {
    const fromSpec = specOf(index, document.elements.find((e) => e.id === connection.from)?.equipmentModelId ?? null);
    const toElement = document.elements.find((e) => e.id === connection.to);
    const toSpec = specOf(index, toElement?.equipmentModelId ?? null);
    if (fromSpec?.poeBudgetW != null && toSpec?.powerDrawW != null) {
      poeDrawByElement.set(connection.from, (poeDrawByElement.get(connection.from) ?? 0) + toSpec.powerDrawW);
    }
  }

  for (const element of document.elements) {
    const spec = specOf(index, element.equipmentModelId);
    if (!spec?.poeBudgetW) continue;
    const draw = poeDrawByElement.get(element.id) ?? 0;
    if (draw > spec.poeBudgetW) {
      anomalies.push({
        severity: 'WARNING',
        code: 'validation.capacity.poeBudgetExceeded',
        elementIds: [element.id],
        connectionIds: [],
        params: { draw, budget: spec.poeBudgetW },
      });
    }
  }

  return anomalies;
}

/** EF-203 — compatibilite : type de lien vs type de port, debit annonce vs debit supporte. */
export function checkCompatibility(document: ArchitectureDocument, index: EquipmentIndex): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const elementById = new Map(document.elements.map((e) => [e.id, e]));

  for (const connection of document.connections) {
    const fromElement = elementById.get(connection.from);
    const toElement = elementById.get(connection.to);
    if (!fromElement || !toElement) continue;

    const fromSpec = specOf(index, fromElement.equipmentModelId);
    const toSpec = specOf(index, toElement.equipmentModelId);

    if (connection.linkType === 'fiber') {
      for (const [element, spec] of [
        [fromElement, fromSpec],
        [toElement, toSpec],
      ] as const) {
        if (spec?.portType && !FIBER_PORT_HINTS.some((hint) => spec.portType!.toLowerCase().includes(hint))) {
          anomalies.push({
            severity: 'WARNING',
            code: 'validation.compatibility.portTypeMismatch',
            elementIds: [element.id],
            connectionIds: [connection.id],
            params: { portType: spec.portType },
          });
        }
      }
    }

    if (connection.linkType === 'wireless' && !WIRELESS_CATEGORIES.has(fromElement.type) && !WIRELESS_CATEGORIES.has(toElement.type)) {
      anomalies.push({
        severity: 'WARNING',
        code: 'validation.compatibility.wirelessCategoryMismatch',
        elementIds: [fromElement.id, toElement.id],
        connectionIds: [connection.id],
      });
    }

    if (connection.speedMbps != null) {
      for (const [element, spec] of [
        [fromElement, fromSpec],
        [toElement, toSpec],
      ] as const) {
        if (spec?.throughputMbps != null && connection.speedMbps > spec.throughputMbps) {
          anomalies.push({
            severity: 'WARNING',
            code: 'validation.compatibility.throughputMismatch',
            elementIds: [element.id],
            connectionIds: [connection.id],
            params: { linkSpeed: connection.speedMbps, supported: spec.throughputMbps },
          });
        }
      }
    }
  }

  return anomalies;
}

/** EF-204 — anomalies structurelles : boucles, points uniques de defaillance, isolement. */
export function checkGraphAnomalies(document: ArchitectureDocument): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const adjacency = new Map<string, { neighbor: string; connectionId: string }[]>();
  for (const element of document.elements) adjacency.set(element.id, []);
  for (const connection of document.connections) {
    adjacency.get(connection.from)?.push({ neighbor: connection.to, connectionId: connection.id });
    adjacency.get(connection.to)?.push({ neighbor: connection.from, connectionId: connection.id });
  }

  // Isolement : aucune connexion, alors que le plan compte au moins deux elements connectables.
  const networkedElements = document.elements.filter((e) => !NON_NETWORKED_CATEGORIES.has(e.type));
  if (networkedElements.length > 1) {
    for (const element of networkedElements) {
      if ((adjacency.get(element.id)?.length ?? 0) === 0) {
        anomalies.push({ severity: 'INFO', code: 'validation.anomaly.isolatedElement', elementIds: [element.id], connectionIds: [] });
      }
    }
  }

  anomalies.push(...detectCycles(document, adjacency));
  anomalies.push(...detectArticulationPoints(document, adjacency));
  return anomalies;
}

/** Boucle = un chemin qui revient sur un noeud deja visite sans reemprunter l'arete d'origine. */
function detectCycles(
  document: ArchitectureDocument,
  adjacency: Map<string, { neighbor: string; connectionId: string }[]>,
): Anomaly[] {
  const visited = new Set<string>();
  const reported = new Set<string>();
  const anomalies: Anomaly[] = [];

  const dfs = (nodeId: string, viaConnectionId: string | null, stack: string[]) => {
    visited.add(nodeId);
    for (const { neighbor, connectionId } of adjacency.get(nodeId) ?? []) {
      if (connectionId === viaConnectionId) continue; // ne pas rebrousser par la meme arete
      if (!visited.has(neighbor)) {
        dfs(neighbor, connectionId, [...stack, connectionId]);
      } else if (stack.includes(connectionId) === false) {
        const key = [connectionId].sort().join();
        if (!reported.has(key)) {
          reported.add(key);
          anomalies.push({
            severity: 'CRITICAL',
            code: 'validation.anomaly.loopDetected',
            elementIds: [],
            connectionIds: [...stack, connectionId],
          });
        }
      }
    }
  };

  for (const element of document.elements) {
    if (!visited.has(element.id)) dfs(element.id, null, []);
  }
  return anomalies;
}

/**
 * Points d'articulation (Tarjan) : un noeud dont le retrait deconnecte le graphe. Signal de
 * SPOF uniquement a partir de 3 elements — sur 2 elements, le lien unique est par construction
 * le seul chemin, ce n'est pas un choix de conception a corriger.
 */
function detectArticulationPoints(
  document: ArchitectureDocument,
  adjacency: Map<string, { neighbor: string; connectionId: string }[]>,
): Anomaly[] {
  if (document.elements.length < 3) return [];

  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const articulationPoints = new Set<string>();
  let time = 0;

  const dfs = (nodeId: string, parent: string | null) => {
    discovery.set(nodeId, time);
    low.set(nodeId, time);
    time += 1;
    let children = 0;

    for (const { neighbor } of adjacency.get(nodeId) ?? []) {
      if (neighbor === parent) continue;
      if (discovery.has(neighbor)) {
        low.set(nodeId, Math.min(low.get(nodeId)!, discovery.get(neighbor)!));
        continue;
      }
      children += 1;
      dfs(neighbor, nodeId);
      low.set(nodeId, Math.min(low.get(nodeId)!, low.get(neighbor)!));
      const isRoot = parent === null;
      if ((isRoot && children > 1) || (!isRoot && low.get(neighbor)! >= discovery.get(nodeId)!)) {
        articulationPoints.add(nodeId);
      }
    }
  };

  for (const element of document.elements) {
    if (!discovery.has(element.id)) dfs(element.id, null);
  }

  return [...articulationPoints].map((elementId) => ({
    severity: 'WARNING' as const,
    code: 'validation.anomaly.singlePointOfFailure',
    elementIds: [elementId],
    connectionIds: [],
  }));
}

export function validateArchitecture(document: ArchitectureDocument, index: EquipmentIndex): ValidationResult {
  const anomalies = [
    ...checkCapacity(document, index),
    ...checkCompatibility(document, index),
    ...checkGraphAnomalies(document),
    ...checkAddressing(document),
    ...checkPlacement(document),
  ];
  return { anomalies, compatible: !anomalies.some((a) => a.severity === 'CRITICAL') };
}
