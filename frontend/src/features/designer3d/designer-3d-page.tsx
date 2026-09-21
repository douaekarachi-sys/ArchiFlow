import { LayoutDashboard } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Canvas } from '@react-three/fiber';
import { Grid, Html, Line, OrbitControls } from '@react-three/drei';
import { ROLE_HOME } from '@archiflow/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useSession } from '@/auth/session-store';
import { errorMessage } from '@/utils/errors';
import { useArchitecture } from '../designer/use-architecture';
import { buildScene3D, type Scene3D, type Scene3DNode } from './scene-layout';

/**
 * Navigation bâtiment → étage → salle → baie (EF-104, schéma physique d'EF-205) : quatre listes
 * en cascade, chacune filtrée par le niveau choisi au-dessus. Choisir une baie filtre la scène
 * à son seul contenu ; sans baie choisie, la scène affiche tout (pas de filtrage partiel par
 * bâtiment/étage/salle seuls — la seule granularité attachable à un équipement est la baie).
 */
function SiteNavigator({
  scene,
  buildingId,
  floorId,
  roomId,
  rackId,
  onChange,
}: {
  scene: Scene3D;
  buildingId: string | null;
  floorId: string | null;
  roomId: string | null;
  rackId: string | null;
  onChange: (next: { buildingId: string | null; floorId: string | null; roomId: string | null; rackId: string | null }) => void;
}) {
  const { t } = useTranslation();
  const floors = scene.floors.filter((f) => !buildingId || f.buildingId === buildingId);
  const rooms = scene.rooms.filter((r) => !floorId || r.floorId === floorId);
  const racks = scene.racks.filter((r) => !roomId || r.roomId === roomId);

  const selectClass = 'h-8 w-full rounded-field border border-line bg-inset px-2 text-xs text-fg';

  return (
    <div className="absolute left-3 top-3 z-10 flex w-64 flex-col gap-2 rounded-card border border-line bg-elevated p-3 shadow-elevated">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">{t('designer3d.navigator.title')}</h2>
        {(buildingId || floorId || roomId || rackId) && (
          <button
            type="button"
            onClick={() => onChange({ buildingId: null, floorId: null, roomId: null, rackId: null })}
            className="text-[11px] text-fg-muted hover:text-fg"
          >
            {t('designer3d.navigator.reset')}
          </button>
        )}
      </div>
      <select
        className={selectClass}
        value={buildingId ?? ''}
        onChange={(e) => onChange({ buildingId: e.target.value || null, floorId: null, roomId: null, rackId: null })}
      >
        <option value="">{t('designer3d.navigator.building')}</option>
        {scene.buildings.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={floorId ?? ''}
        disabled={!buildingId}
        onChange={(e) => onChange({ buildingId, floorId: e.target.value || null, roomId: null, rackId: null })}
      >
        <option value="">{t('designer3d.navigator.floor')}</option>
        {floors.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={roomId ?? ''}
        disabled={!floorId}
        onChange={(e) => onChange({ buildingId, floorId, roomId: e.target.value || null, rackId: null })}
      >
        <option value="">{t('designer3d.navigator.room')}</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={rackId ?? ''}
        disabled={!roomId}
        onChange={(e) => onChange({ buildingId, floorId, roomId, rackId: e.target.value || null })}
      >
        <option value="">{t('designer3d.navigator.rack')}</option>
        {racks.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      {rackId && <p className="text-[11px] text-fg-muted">{t('designer3d.navigator.filtered')}</p>}
    </div>
  );
}

/**
 * Vue 3D en consultation (EF-104, Phase 9 anticipée) : le MÊME document que le designer 2D
 * (ADR 0001), jamais un second modèle. Pas d'édition ici — orbite, zoom, sélection seulement.
 * Chunk chargé paresseusement (router.tsx) : jamais atteint depuis un tableau de bord.
 */
export function Designer3DPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const role = useSession((s) => s.profile?.role);
  const query = useArchitecture(projectId ?? '');
  const [selected, setSelected] = useState<Scene3DNode | null>(null);
  const [nav, setNav] = useState<{ buildingId: string | null; floorId: string | null; roomId: string | null; rackId: string | null }>({
    buildingId: null,
    floorId: null,
    roomId: null,
    rackId: null,
  });

  const scene = useMemo(() => (query.data ? buildScene3D(query.data) : null), [query.data]);
  const visibleNodes = useMemo(() => {
    if (!scene) return [];
    return nav.rackId ? scene.nodes.filter((n) => n.rackId === nav.rackId) : scene.nodes;
  }, [scene, nav.rackId]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => (scene ? scene.edges.filter((e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)) : []),
    [scene, visibleNodeIds],
  );

  if (!projectId) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 flex flex-col md:left-64">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <h1 className="truncate text-sm font-semibold text-fg">{t('designer3d.title')}</h1>
        {role && (
          <Button asChild variant="secondary" size="sm" icon={<LayoutDashboard />}>
            <Link to={`${ROLE_HOME[role]}/projects/${projectId}/design`}>{t('designer3d.backTo2d')}</Link>
          </Button>
        )}
      </header>

      {query.isPending ? (
        <div className="flex flex-1 flex-col gap-3 p-6" aria-busy="true">
          <Skeleton className="flex-1" />
        </div>
      ) : query.isError ? (
        <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} className="flex-1" />
      ) : !scene || scene.nodes.length === 0 ? (
        <EmptyState icon={<LayoutDashboard />} title={t('designer3d.empty')} description={t('designer3d.emptyHint')} className="flex-1" />
      ) : (
        <div className="relative flex flex-1 overflow-hidden">
          {scene.hasPhysicalPlacement ? (
            <SiteNavigator scene={scene} {...nav} onChange={setNav} />
          ) : (
            <Alert tone="info" className="absolute left-3 top-3 z-10 max-w-sm">
              {t('designer3d.noPhysicalPlacement')}
            </Alert>
          )}
          <Canvas camera={{ position: [8, 8, 8], fov: 50 }} className="flex-1">
            <ambientLight intensity={0.7} />
            <directionalLight position={[10, 12, 8]} intensity={0.6} />
            <Suspense fallback={null}>
              <Grid infiniteGrid cellSize={1} sectionSize={5} fadeDistance={40} />
              {visibleEdges.map((edge) => {
                const from = visibleNodes.find((n) => n.id === edge.from);
                const to = visibleNodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <Line
                    key={edge.id}
                    points={[
                      [from.x, 0.4, from.z],
                      [to.x, 0.4, to.z],
                    ]}
                    color="#94A3B8"
                    lineWidth={1.5}
                  />
                );
              })}
              {visibleNodes.map((node) => (
                <mesh
                  key={node.id}
                  position={[node.x, 0.4, node.z]}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelected(node);
                  }}
                >
                  <boxGeometry args={[0.7, 0.8, 0.7]} />
                  <meshStandardMaterial color={node.color} emissive={selected?.id === node.id ? node.color : '#000000'} emissiveIntensity={selected?.id === node.id ? 0.4 : 0} />
                  <Html position={[0, 0.7, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                    <span className="whitespace-nowrap rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-fg shadow">{node.label}</span>
                  </Html>
                </mesh>
              ))}
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>

          {nav.rackId && visibleNodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-card border border-line bg-elevated px-4 py-2 text-sm text-fg-secondary shadow-elevated">
                {t('designer3d.navigator.emptyRack')}
              </p>
            </div>
          )}

          {selected && (
            <aside className="absolute right-3 top-3 w-64 rounded-card border border-line bg-elevated p-4 shadow-elevated">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-fg">{selected.label}</h2>
                <button type="button" onClick={() => setSelected(null)} className="text-xs text-fg-muted hover:text-fg" aria-label={t('common.close')}>
                  ✕
                </button>
              </div>
              <dl className="mt-2 space-y-1 text-xs text-fg-secondary">
                <div className="flex justify-between gap-2">
                  <dt>{t('designer3d.category')}</dt>
                  <dd>{t(`equipment.category.${selected.category}`, { defaultValue: selected.category })}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t('designer3d.equipmentModel')}</dt>
                  <dd>{selected.equipmentModelId ? t('designer3d.fromCatalog') : t('designer3d.noModel')}</dd>
                </div>
              </dl>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
