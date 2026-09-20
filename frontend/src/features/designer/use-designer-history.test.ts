import type { ArchitectureDocument } from '@archiflow/shared';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDesignerHistory } from './use-designer-history';

const EMPTY: ArchitectureDocument = { elements: [], connections: [], zones: [] };

const addElement: (draft: ArchitectureDocument) => void = (draft) => {
  draft.elements.push({ id: 'fw-01', type: 'firewall', equipmentModelId: null, label: 'Pare-feu', position: { x: 0, y: 0 }, config: {} });
};

describe('useDesignerHistory', () => {
  it('mutate applique la recette et permet un undo/redo exact', () => {
    const { result } = renderHook(() => useDesignerHistory(EMPTY));

    act(() => result.current.mutate(addElement));
    expect(result.current.document.elements).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.undo());
    expect(result.current.document.elements).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.document.elements).toHaveLength(1);
    expect(result.current.document.elements[0]?.id).toBe('fw-01');
  });

  it('une nouvelle mutation après un undo efface le futur (pas de redo fantôme)', () => {
    const { result } = renderHook(() => useDesignerHistory(EMPTY));

    act(() => result.current.mutate(addElement));
    act(() => result.current.undo());
    act(() =>
      result.current.mutate((draft) => {
        draft.elements.push({ id: 'sw-01', type: 'switch', equipmentModelId: null, label: 'Switch', position: { x: 0, y: 0 }, config: {} });
      }),
    );

    expect(result.current.canRedo).toBe(false);
    expect(result.current.document.elements.map((e) => e.id)).toEqual(['sw-01']);
  });

  it('une recette qui ne change rien ne pousse aucune entrée d’historique', () => {
    const { result } = renderHook(() => useDesignerHistory(EMPTY));
    act(() => result.current.mutate(() => {}));
    expect(result.current.canUndo).toBe(false);
  });

  it('replace vide l’historique sans le compter comme une mutation', () => {
    const { result } = renderHook(() => useDesignerHistory(EMPTY));
    act(() => result.current.mutate(addElement));
    act(() => result.current.replace(EMPTY));
    expect(result.current.document).toEqual(EMPTY);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
