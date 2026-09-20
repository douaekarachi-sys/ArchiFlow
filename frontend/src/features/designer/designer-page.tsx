import { EMPTY_DOCUMENT, type ArchitectureElement } from '@archiflow/shared';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LayoutDashboard, Monitor, Redo2, Save, Undo2 } from 'lucide-react';
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useCan } from '@/permissions/portals';
import { errorMessage } from '@/utils/errors';
import { useTheme } from '@/utils/theme';
import { applyDesignerAction, type DesignerAction } from './designer-actions';
import { toFlow, type EquipmentFlowNode, type LabeledFlowEdge } from './document-adapter';
import { EQUIPMENT_DRAG_MIME, type EquipmentDragPayload } from './drag-payload';
import { ElementInspector } from './element-inspector';
import { EquipmentNode } from './equipment-node';
import { EquipmentPalette } from './equipment-palette';
import { LabeledEdge } from './labeled-edge';
import { useArchitecture, useSaveArchitecture } from './use-architecture';
import { useDesignerHistory } from './use-designer-history';
import { useIsDesktop } from './use-is-desktop';

const NODE_TYPES = { equipment: EquipmentNode };
const EDGE_TYPES = { labeled: LabeledEdge };
/** Doivent rester synchronisés avec --canvas-grid / --canvas-snap (tokens.css). */
const CANVAS_GRID_SIZE = 24;
const CANVAS_SNAP_SIZE = 8;

export function DesignerPage() {
  const { id: projectId } = useParams<{ id: string }>();
  if (!projectId) return null;
  return (
    <ReactFlowProvider>
      <DesignerCanvas projectId={projectId} />
    </ReactFlowProvider>
  );
}

function DesignerCanvas({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const canEdit = useCan('architecture.edit');
  const resolvedTheme = useTheme((s) => s.resolved);
  const query = useArchitecture(projectId);
  const save = useSaveArchitecture(projectId);
  const history = useDesignerHistory(EMPTY_DOCUMENT);
  const { screenToFlowPosition } = useReactFlow();

  const savedRef = useRef(EMPTY_DOCUMENT);
  const loadedRef = useRef(false);
  const [nodes, setNodes] = useState<EquipmentFlowNode[]>([]);
  const [edges, setEdges] = useState<LabeledFlowEdge[]>([]);

  useEffect(() => {
    if (!query.data || loadedRef.current) return;
    loadedRef.current = true;
    history.replace(query.data);
    savedRef.current = query.data;
  }, [query.data, history]);

  useEffect(() => {
    const view = toFlow(history.document);
    setNodes(view.nodes);
    setEdges(view.edges);
  }, [history.document]);

  const zones = useMemo(() => toFlow(history.document).zones, [history.document]);
  const dirty = history.document !== savedRef.current;

  const dispatch = useCallback(
    (action: DesignerAction) => history.mutate((draft) => applyDesignerAction(draft, action)),
    [history],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<EquipmentFlowNode>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      for (const change of changes) if (change.type === 'remove') dispatch({ type: 'deleteElement', elementId: change.id });
    },
    [dispatch],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<LabeledFlowEdge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      for (const change of changes) if (change.type === 'remove') dispatch({ type: 'deleteConnection', connectionId: change.id });
    },
    [dispatch],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: EquipmentFlowNode) => dispatch({ type: 'moveElement', elementId: node.id, position: node.position }),
    [dispatch],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const id = crypto.randomUUID();
      setEdges((eds) => addEdge({ ...connection, id, type: 'labeled', data: { linkType: 'copper' } }, eds));
      dispatch({ type: 'addConnection', connection: { id, from: connection.source, to: connection.target, linkType: 'copper' } });
    },
    [dispatch],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(EQUIPMENT_DRAG_MIME);
      if (!raw) return;
      const payload = JSON.parse(raw) as EquipmentDragPayload;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const element: ArchitectureElement = {
        id: crypto.randomUUID(),
        type: payload.category,
        equipmentModelId: payload.equipmentModelId,
        label: payload.label,
        position,
        config: {},
      };
      dispatch({ type: 'addElement', element });
    },
    [dispatch, screenToFlowPosition],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (editing || !(event.ctrlKey || event.metaKey)) return;
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        history.undo();
      } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
        event.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history]);

  const selectedNode = nodes.find((n) => n.selected) ?? null;
  const selectedEdge = edges.find((e) => e.selected) ?? null;

  if (!isDesktop) {
    return <EmptyState icon={<Monitor />} title={t('desktopOnly.title')} description={t('desktopOnly.description')} className="py-16" />;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 flex flex-col md:left-64">
      {query.isPending ? (
        <div className="flex flex-1 flex-col gap-3 p-6" aria-busy="true">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="flex-1" />
        </div>
      ) : query.isError ? (
        <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} className="flex-1" />
      ) : (
        <>
          <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-fg">{t('designer.title')}</h1>
              {!canEdit && <p className="text-xs text-fg-muted">{t('designer.readOnly')}</p>}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon-sm" icon={<Undo2 />} aria-label={t('designer.undo')} disabled={!history.canUndo} onClick={() => history.undo()} />
                  <Button variant="ghost" size="icon-sm" icon={<Redo2 />} aria-label={t('designer.redo')} disabled={!history.canRedo} onClick={() => history.redo()} />
                  <Button
                    size="md"
                    icon={<Save />}
                    loading={save.isPending}
                    disabled={!dirty}
                    onClick={() =>
                      save.mutate(history.document, {
                        onSuccess: (saved) => {
                          savedRef.current = saved;
                        },
                      })
                    }
                  >
                    {t('designer.save')}
                  </Button>
                </>
              )}
            </div>
          </header>
          {save.isError && (
            <Alert tone="critical" className="m-3">
              {errorMessage(t, save.error)}
            </Alert>
          )}
          <div className="flex flex-1 overflow-hidden">
            {canEdit && <EquipmentPalette />}
            <div className="relative flex-1" onDragOver={(e) => canEdit && e.preventDefault()} onDrop={canEdit ? onDrop : undefined}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                onNodesChange={canEdit ? onNodesChange : undefined}
                onEdgesChange={canEdit ? onEdgesChange : undefined}
                onNodeDragStop={canEdit ? onNodeDragStop : undefined}
                onConnect={canEdit ? onConnect : undefined}
                nodesDraggable={canEdit}
                nodesConnectable={canEdit}
                elementsSelectable
                snapToGrid
                snapGrid={[CANVAS_SNAP_SIZE, CANVAS_SNAP_SIZE]}
                onlyRenderVisibleElements
                deleteKeyCode={canEdit ? ['Backspace', 'Delete'] : []}
                fitView
                colorMode={resolvedTheme}
              >
                <Background gap={CANVAS_GRID_SIZE} />
                <Controls showInteractive={canEdit} />
                <MiniMap pannable zoomable className="!bg-surface" />
              </ReactFlow>
              {nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <EmptyState
                    icon={<LayoutDashboard />}
                    title={t('designer.empty')}
                    description={canEdit ? t('designer.emptyHintEdit') : t('designer.emptyHintRead')}
                  />
                </div>
              )}
            </div>
            {canEdit && <ElementInspector selectedNode={selectedNode} selectedEdge={selectedEdge} zones={zones} dispatch={dispatch} />}
          </div>
        </>
      )}
    </div>
  );
}
