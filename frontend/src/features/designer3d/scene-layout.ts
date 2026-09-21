import type { ArchitectureDocument } from '@archiflow/shared';
import { CATEGORY_HEX } from './category-colors';

/**
 * Transforme le document d'architecture (le MÊME que le designer 2D, ADR 0001 — aucun second
 * modèle) en positions 3D. Fonction pure, testable sans WebGL : la scène React Three Fiber ne
 * fait que consommer sa sortie.
 *
 * Navigation bâtiment → étage → salle → baie (EF-104) : dépend de `placement`, posé par la
 * construction physique (Phase 6, pas encore livrée). Tant qu'aucun élément n'a de `placement`,
 * la scène retombe sur une vue à plat — état honnête, pas une fonctionnalité simulée.
 */

export interface Scene3DNode {
  id: string;
  label: string;
  category: string;
  color: string;
  /** Mètres, plan XZ — dérivés de `position.x/y` du document 2D, mis à l'échelle et centrés. */
  x: number;
  z: number;
  equipmentModelId: string | null;
}

export interface Scene3DEdge {
  id: string;
  from: string;
  to: string;
  linkType: string;
}

export interface Scene3D {
  nodes: Scene3DNode[];
  edges: Scene3DEdge[];
  /** true si au moins un élément porte un `placement` physique (Phase 6) — sinon vue à plat. */
  hasPhysicalPlacement: boolean;
}

const SCALE = 1 / 60; // ~60 px du canvas 2D = 1 mètre en scène 3D : ordre de grandeur d'une salle.

export function buildScene3D(document: ArchitectureDocument): Scene3D {
  if (document.elements.length === 0) return { nodes: [], edges: [], hasPhysicalPlacement: false };

  const xs = document.elements.map((e) => e.position.x);
  const ys = document.elements.map((e) => e.position.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  const nodes: Scene3DNode[] = document.elements.map((el) => ({
    id: el.id,
    label: el.label,
    category: el.type,
    color: CATEGORY_HEX[el.type as keyof typeof CATEGORY_HEX] ?? '#94A3B8',
    x: (el.position.x - centerX) * SCALE,
    z: (el.position.y - centerY) * SCALE,
    equipmentModelId: el.equipmentModelId,
  }));

  const edges: Scene3DEdge[] = document.connections.map((c) => ({ id: c.id, from: c.from, to: c.to, linkType: c.linkType }));

  return { nodes, edges, hasPhysicalPlacement: document.elements.some((e) => e.placement != null) };
}
