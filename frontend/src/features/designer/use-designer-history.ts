import type { ArchitectureDocument } from '@archiflow/shared';
import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import { useCallback, useState } from 'react';

enablePatches();

interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
}

interface HistoryState {
  document: ArchitectureDocument;
  past: HistoryEntry[];
  future: HistoryEntry[];
}

/**
 * Historique par patchs Immer (ARCHITECTURE-CIBLE §6.8, principe 3) : la pile stocke des
 * patchs, pas des copies complètes du document — soutenable à plusieurs centaines d'éléments.
 * Une action utilisateur = une entrée : un déplacement à la souris n'appelle `mutate` qu'au
 * relâchement, jamais à chaque frame.
 */
export function useDesignerHistory(initial: ArchitectureDocument) {
  const [state, setState] = useState<HistoryState>({ document: initial, past: [], future: [] });

  const mutate = useCallback((recipe: (draft: ArchitectureDocument) => void) => {
    setState((s) => {
      const [next, patches, inversePatches] = produceWithPatches(s.document, recipe);
      if (patches.length === 0) return s;
      return { document: next, past: [...s.past, { patches, inversePatches }], future: [] };
    });
  }, []);

  /** Remplacement intégral (chargement, sauvegarde réussie) : jamais une entrée d'historique. */
  const replace = useCallback((next: ArchitectureDocument) => {
    setState({ document: next, past: [], future: [] });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const entry = s.past[s.past.length - 1]!;
      return { document: applyPatches(s.document, entry.inversePatches), past: s.past.slice(0, -1), future: [...s.future, entry] };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const entry = s.future[s.future.length - 1]!;
      return { document: applyPatches(s.document, entry.patches), past: [...s.past, entry], future: s.future.slice(0, -1) };
    });
  }, []);

  return {
    document: state.document,
    mutate,
    replace,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
