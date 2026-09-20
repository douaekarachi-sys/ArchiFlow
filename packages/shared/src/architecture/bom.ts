import type { ArchitectureDocument } from './document.schema.js';

/**
 * Nomenclature (BOM) et coûts (EF-302, EF-303) : DÉRIVÉS du document d'architecture, jamais
 * saisis à la main. Fonction pure (ADR 0002) : elle lit le document — normalement un snapshot
 * de version, dont `frozenSpec` porte les caractéristiques ET le prix figés au moment de la
 * sauvegarde (ADR 0001), pour un chiffrage reproductible même si le catalogue a changé depuis.
 *
 * « Mise en œuvre » (EF-303, en option au CDC) n'a aucune source de données dans le catalogue —
 * aucun tarif horaire, aucune règle de labeur. Pas de champ chiffré ici : l'inventer serait une
 * donnée fictive présentée comme réelle. Voir DECISIONS-OUVERTES.md.
 */

export interface BomLine {
  equipmentModelId: string;
  name: string;
  reference: string;
  category: string;
  quantity: number;
  unitPrice: number | null;
  currency: string | null;
  licenseAnnualCost: number | null;
  subtotal: number | null;
  licenseSubtotal: number | null;
}

export interface BillOfMaterials {
  lines: BomLine[];
  /** Éléments sans modèle catalogue, ou dont le prix n'a pas été renseigné : jamais comptés en silence dans le total. */
  unpricedElementCount: number;
  materialTotal: number;
  licenseTotal: number;
  currency: string | null;
  grandTotal: number;
}

export function buildBom(document: ArchitectureDocument): BillOfMaterials {
  const byModel = new Map<string, BomLine>();
  let unpricedElementCount = 0;
  let currency: string | null = null;

  for (const element of document.elements) {
    if (!element.equipmentModelId) {
      unpricedElementCount += 1;
      continue;
    }
    const spec = element.frozenSpec;
    if (!spec) {
      unpricedElementCount += 1;
      continue;
    }

    const existing = byModel.get(element.equipmentModelId);
    if (existing) {
      existing.quantity += 1;
    } else {
      const unitPrice = spec.indicativePrice ?? null;
      if (unitPrice == null) unpricedElementCount += 1;
      if (currency == null && spec.currency) currency = spec.currency;
      byModel.set(element.equipmentModelId, {
        equipmentModelId: element.equipmentModelId,
        name: spec.name,
        reference: spec.reference,
        category: element.type,
        quantity: 1,
        unitPrice,
        currency: spec.currency ?? null,
        licenseAnnualCost: spec.licenseAnnualCost ?? null,
        subtotal: null,
        licenseSubtotal: null,
      });
    }
  }

  const lines = [...byModel.values()]
    .map((line) => ({
      ...line,
      subtotal: line.unitPrice != null ? line.unitPrice * line.quantity : null,
      licenseSubtotal: line.licenseAnnualCost != null ? line.licenseAnnualCost * line.quantity : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const materialTotal = lines.reduce((sum, l) => sum + (l.subtotal ?? 0), 0);
  const licenseTotal = lines.reduce((sum, l) => sum + (l.licenseSubtotal ?? 0), 0);

  return {
    lines,
    unpricedElementCount,
    materialTotal,
    licenseTotal,
    currency,
    grandTotal: materialTotal + licenseTotal,
  };
}
