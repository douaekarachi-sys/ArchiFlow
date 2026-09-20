import {
  EMPTY_DOCUMENT,
  ROLE_HOME,
  type Anomaly,
  type AnomalySeverity,
  type ArchitectureElement,
  type EquipmentIndex,
  validateArchitecture,
} from '@archiflow/shared';
import { useQuery } from '@tanstack/react-query';
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
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { History, LayoutDashboard, Monitor, Redo2, Save, Undo2 } from 'lucide-react';
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { cn } from '@/utils/cn';
import { useCan } from '@/permissions/portals';
import { useSession } from '@/auth/session-store';
import { errorMessage } from '@/utils/errors';
import { useTheme } from '@/utils/theme';
import { applyDesignerAction, type DesignerAction } from './designer-actions';
import { toFlow, type EquipmentFlowNode, type FlowNode, type LabeledFlowEdge, type ZoneFlowNode } from './document-adapter';
import { EQUIPMENT_DRAG_MIME, type EquipmentDragPayload } from './drag-payload';
import { ElementInspector } from './element-inspector';
import { EquipmentNode } from './equipment-node';
import { EquipmentPalette } from './equipment-palette';
import { LabeledEdge } from './labeled-edge';
import { useArchitecture, useSaveArchitecture } from './use-architecture';
import { useDesignerHistory } from './use-designer-history';
import { useIsDesktop } from './use-is-desktop';
import { ZONE_APPEARANCE } from './zone-appearance';
import { catalogApi } from '@/api/endpoints';

const NODE_TYPES = { equipment: EquipmentNode, zone: ZoneNode };
const EDGE_TYPES = { labeled: LabeledEdge };
/** Doivent rester synchronisés avec --canvas-grid / --canvas-snap (tokens.css). */
const CANVAS_GRID_SIZE = 24;
const CANVAS_SNAP_SIZE = 8;
const SEVERITY_ORDER = ['CRITICAL', 'WARNING', 'INFO'] as const;

const SEVERITY_CLASS: Record<AnomalySeverity, string> = {
  CRITICAL: 'border-red-500/60 bg-red-500/10 text-red-200',
  WARNING: 'border-amber-500/60 bg-amber-500/10 text-amber-200',
  INFO: 'border-sky-500/60 bg-sky-500/10 text-sky-200',
};

const DOT_CLASS: Record<AnomalySeverity, string> = {
  CRITICAL: 'bg-red-500',
  WARNING: 'bg-amber-500',
  INFO: 'bg-sky-500',
};

function buildEquipmentIndex(
  items: Array<{
    id: string;
    portCount: number | null;
    portType: string | null;
    throughputMbps: number | null;
    poeBudgetW: number | null;
    powerDrawW: number | null;
  }>,
): EquipmentIndex {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        portCount: item.portCount ?? null,
        portType: item.portType ?? null,
        throughputMbps: item.throughputMbps ?? null,
        poeBudgetW: item.poeBudgetW ?? null,
        powerDrawW: item.powerDrawW ?? null,
      },
    ]),
  );
}

function ValidationPanel({
  anomalies,
  compatible,
  t,
  className,
}: {
  anomalies: Anomaly[];
  compatible: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  className?: string;
}) {
  if (anomalies.length === 0) {
    return (
      <div className={cn('border-t border-line bg-surface px-4 py-3 text-sm text-fg-secondary', className)}>
        {t('designer.validation.none')}
      </div>
    );
  }

  const totals = SEVERITY_ORDER.reduce(
    (acc, severity) => {
      acc[severity] = anomalies.filter((anomaly) => anomaly.severity === severity).length;
      return acc;
    },
    { CRITICAL: 0, WARNING: 0, INFO: 0 } as Record<AnomalySeverity, number>,
  );
  // Triées par sévérité : une CRITICAL ne doit jamais rester masquée derrière des WARNING/INFO plus nombreuses.
  const sorted = [...anomalies].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const visible = sorted.slice(0, 5);
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className={cn('border-t border-line bg-surface px-4 py-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{t('designer.validation.title')}</span>
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
              compatible ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-red-500/60 bg-red-500/10 text-red-200',
            )}
          >
            {compatible ? t('designer.validation.compatible') : t('designer.validation.incompatible')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-fg-muted">
          {SEVERITY_ORDER.map((severity) => (
            <span key={severity} className={cn('inline-flex rounded-full border px-2 py-0.5', SEVERITY_CLASS[severity])}>
              {severity} {totals[severity]}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((anomaly) => (
          <li
            key={`${anomaly.code}-${anomaly.elementIds.join('-')}-${anomaly.connectionIds.join('-')}`}
            className="flex gap-2 rounded-md border border-line bg-inset px-2.5 py-2"
          >
            <span
              className={cn('mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full', DOT_CLASS[anomaly.severity])}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-fg">{t(anomaly.code, anomaly.params ?? {})}</p>
              <p className="mt-0.5 text-[11px] text-fg-muted">
                {anomaly.severity} ·{' '}
                {anomaly.elementIds.length > 0 ? anomaly.elementIds.join(', ') : anomaly.connectionIds.join(', ') || t('designer.validation.unknown')}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-2 text-[11px] text-fg-muted">{t('designer.validation.more', { count: hiddenCount })}</p>
      )}
    </div>
  );
}

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
  const role = useSession((s) => s.profile?.role);
  const resolvedTheme = useTheme((s) => s.resolved);
  const query = useArchitecture(projectId);
  const save = useSaveArchitecture(projectId);
  const history = useDesignerHistory(EMPTY_DOCUMENT);
  const catalogQuery = useQuery({
    queryKey: ['catalog', 'equipment', 'designer'],
    queryFn: () => catalogApi.equipment({ page: 1, pageSize: 500 }),
    staleTime: 60_000,
  });
  const { screenToFlowPosition } = useReactFlow();

  const savedRef = useRef(EMPTY_DOCUMENT);
  const loadedRef = useRef(false);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
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
  const equipmentIndex = useMemo(() => buildEquipmentIndex(catalogQuery.data?.data ?? []), [catalogQuery.data?.data]);
  const validation = useMemo(() => validateArchitecture(history.document, equipmentIndex), [history.document, equipmentIndex]);
  const dirty = history.document !== savedRef.current;

  const dispatch = useCallback(
    (action: DesignerAction) => history.mutate((draft) => applyDesignerAction(draft, action)),
    [history],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      for (const change of changes) {
        if (change.type === 'remove' && change.id.startsWith('zone-') === false) {
          dispatch({ type: 'deleteElement', elementId: change.id });
        }
      }
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
    (_event: unknown, node: FlowNode) => {
      if (node.type !== 'equipment') return;
      dispatch({ type: 'moveElement', elementId: node.id, position: node.position });
    },
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

  const selectedNode = nodes.find((n) => n.selected && n.type === 'equipment') as EquipmentFlowNode | null;
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
              {role && (
                <Button asChild variant="ghost" size="sm" icon={<History />}>
                  <Link to={`${ROLE_HOME[role]}/projects/${projectId}/versions`}>{t('designer.history')}</Link>
                </Button>
              )}
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
              <p>{errorMessage(t, save.error)}</p>
              {save.error instanceof ApiError && save.error.code === 'ARCHITECTURE_INCOMPATIBLE' && (
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  {((save.error.details as { anomalies?: Anomaly[] } | undefined)?.anomalies ?? []).map((anomaly) => (
                    <li key={`${anomaly.code}-${anomaly.elementIds.join('-')}-${anomaly.connectionIds.join('-')}`}>
                      {t(anomaly.code, anomaly.params)}
                    </li>
                  ))}
                </ul>
              )}
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
          <ValidationPanel
            anomalies={validation.anomalies}
            compatible={validation.compatible}
            t={t}
            className="border-t border-line bg-surface"
          />
        </>
      )}
    </div>
  );
}

function ZoneNode({ data }: NodeProps<ZoneFlowNode>) {
  const appearance = ZONE_APPEARANCE[data.zoneType];
  return (
    <div
      className={cn(
        'pointer-events-none h-full w-full rounded-2xl border border-dashed bg-surface/60 shadow-sm',
        appearance.border,
        appearance.bg,
      )}
      style={{ boxSizing: 'border-box' }}
      aria-label={data.label}
    >
      <div className="flex items-center gap-2 rounded-t-2xl border-b border-current/20 bg-surface/70 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
        <span className={cn('size-2 rounded-full', appearance.dot)} aria-hidden="true" />
        <span className={appearance.text}>{data.label}</span>
      </div>
    </div>
  );
}
