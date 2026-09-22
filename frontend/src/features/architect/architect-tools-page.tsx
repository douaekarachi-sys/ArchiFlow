import { Box, LayoutPanelTop, MapPinned, ShieldCheck, Waypoints } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ROLE_HOME, checkAddressing, validateArchitecture, type Role } from '@archiflow/shared';
import { catalogApi } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useArchitecture } from '@/features/designer/use-architecture';
import { buildEquipmentIndex, ValidationPanel } from '@/features/designer/validation-panel';
import { errorMessage } from '@/utils/errors';
import { ProjectPicker } from '../projects/project-picker';

/**
 * Trois pages du portail Architecte (T16, point 2) — chacune une VUE DÉRIVÉE du document
 * d'architecture déjà stocké (ADR 0001) : aucun nouveau modèle, aucune nouvelle route de calcul.
 * Le concepteur 2D reste le seul endroit où on ÉDITE — ces pages sont en lecture, un point
 * d'entrée direct depuis le menu plutôt qu'un détour par la fiche projet.
 */

export function PhysicalViewPickerPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  return <ProjectPicker title={t('nav.physicalView')} description={t('architectTools.physicalPickerDescription')} icon={MapPinned} basePath={ROLE_HOME[role]} linkSuffix="physical" />;
}

export function AddressingPickerPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  return <ProjectPicker title={t('nav.addressPlan')} description={t('architectTools.addressingPickerDescription')} icon={Waypoints} basePath={ROLE_HOME[role]} linkSuffix="addressing" />;
}

export function ValidationPickerPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  return <ProjectPicker title={t('nav.validationCheck')} description={t('architectTools.validationPickerDescription')} icon={ShieldCheck} basePath={ROLE_HOME[role]} linkSuffix="validation" />;
}

function ToolHeader({ projectId, title, subtitle }: { projectId: string; title: string; subtitle: string }) {
  const { t } = useTranslation();
  const role = useSession((s) => s.profile?.role);
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      action={
        role && (
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm" icon={<LayoutPanelTop />}>
              <Link to={`${ROLE_HOME[role]}/projects/${projectId}/design`}>{t('projects.detail.openDesigner')}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm" icon={<Box />}>
              <Link to={`${ROLE_HOME[role]}/projects/${projectId}/3d`}>{t('designer3d.title')}</Link>
            </Button>
          </div>
        )
      }
    />
  );
}

export function PhysicalViewDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const query = useArchitecture(projectId ?? '');

  if (!projectId) return null;
  if (query.isPending) return <Skeleton className="h-64" />;
  if (query.isError) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;

  const doc = query.data;
  const buildings = doc.buildings ?? [];
  const floors = doc.floors ?? [];
  const rooms = doc.rooms ?? [];
  const racks = doc.racks ?? [];
  const countByRack = new Map<string, number>();
  for (const el of doc.elements) {
    if (el.placement?.rackId) countByRack.set(el.placement.rackId, (countByRack.get(el.placement.rackId) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader projectId={projectId} title={t('nav.physicalView')} subtitle={t('architectTools.physicalSubtitle')} />
      {buildings.length === 0 ? (
        <EmptyState icon={<MapPinned />} title={t('architectTools.physicalEmpty')} description={t('architectTools.physicalEmptyHint')} />
      ) : (
        <div className="flex flex-col gap-4">
          {buildings.map((building) => (
            <section key={building.id} className="rounded-card border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-fg">{building.name}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {floors.filter((f) => f.buildingId === building.id).map((floor) => (
                  <div key={floor.id} className="rounded-field border border-line bg-inset p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-muted">{floor.name}</h3>
                    <ul className="mt-2 flex flex-col gap-2">
                      {rooms.filter((r) => r.floorId === floor.id).map((room) => (
                        <li key={room.id}>
                          <p className="text-sm font-medium text-fg">{room.name}</p>
                          <ul className="mt-1 flex flex-wrap gap-2">
                            {racks.filter((rk) => rk.roomId === room.id).map((rack) => (
                              <li key={rack.id} className="rounded-field border border-line bg-surface px-2.5 py-1.5 text-xs text-fg-secondary">
                                {rack.name} — {t('architectTools.rackUnitsCount', { count: rack.totalUnits })} —{' '}
                                {t('architectTools.rackEquipmentCount', { count: countByRack.get(rack.id) ?? 0 })}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddressingDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const query = useArchitecture(projectId ?? '');
  const anomalies = useMemo(() => (query.data ? checkAddressing(query.data) : []), [query.data]);

  if (!projectId) return null;
  if (query.isPending) return <Skeleton className="h-64" />;
  if (query.isError) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;

  const networks = query.data.networks ?? [];
  const labelsByNetwork = new Map<string, string[]>();
  for (const el of query.data.elements) {
    if (el.networkId) labelsByNetwork.set(el.networkId, [...(labelsByNetwork.get(el.networkId) ?? []), el.label]);
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader projectId={projectId} title={t('nav.addressPlan')} subtitle={t('architectTools.addressingSubtitle')} />
      {networks.length === 0 ? (
        <EmptyState icon={<Waypoints />} title={t('architectTools.addressingEmpty')} description={t('architectTools.addressingEmptyHint')} />
      ) : (
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-[0.08em] text-fg-muted">
              <tr>
                <th className="px-4 py-2 text-left">{t('architectTools.addressingColumns.network')}</th>
                <th className="px-4 py-2 text-left">{t('architectTools.addressingColumns.vlan')}</th>
                <th className="px-4 py-2 text-left">{t('architectTools.addressingColumns.cidr')}</th>
                <th className="px-4 py-2 text-left">{t('architectTools.addressingColumns.gateway')}</th>
                <th className="px-4 py-2 text-left">{t('architectTools.addressingColumns.dhcp')}</th>
                <th className="px-4 py-2 text-left">{t('architectTools.addressingColumns.equipment')}</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((network) => (
                <tr key={network.id} className="border-t border-line">
                  <td className="px-4 py-2 font-medium text-fg">{network.name}</td>
                  <td className="px-4 py-2 text-fg-secondary">{network.vlanId}</td>
                  <td className="px-4 py-2 font-mono text-xs text-fg-secondary">{network.cidr}</td>
                  <td className="px-4 py-2 text-fg-secondary">{network.gateway ?? '—'}</td>
                  <td className="px-4 py-2 text-fg-secondary">
                    {network.dhcpRangeStart && network.dhcpRangeEnd ? `${network.dhcpRangeStart} – ${network.dhcpRangeEnd}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-fg-secondary">{labelsByNetwork.get(network.id)?.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {anomalies.length > 0 && (
        <div className="flex flex-col gap-2">
          {anomalies.map((a, i) => (
            <Alert key={i} tone={a.severity === 'CRITICAL' ? 'critical' : 'warning'}>
              {t(a.code, a.params)}
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}

export function ValidationDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const architecture = useArchitecture(projectId ?? '');
  const catalog = useQuery({
    queryKey: ['catalog', 'equipment', 'validation'],
    queryFn: () => catalogApi.equipment({ page: 1, pageSize: 100 }),
  });
  const equipmentIndex = useMemo(() => buildEquipmentIndex(catalog.data?.data ?? []), [catalog.data?.data]);
  const result = useMemo(
    () => (architecture.data ? validateArchitecture(architecture.data, equipmentIndex) : null),
    [architecture.data, equipmentIndex],
  );

  if (!projectId) return null;
  if (architecture.isPending || catalog.isPending) return <Skeleton className="h-64" />;
  if (architecture.isError) return <ErrorState message={errorMessage(t, architecture.error)} onRetry={() => void architecture.refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader projectId={projectId} title={t('nav.validationCheck')} subtitle={t('architectTools.validationSubtitle')} />
      {result && (
        <div className="overflow-hidden rounded-card border border-line">
          <ValidationPanel anomalies={result.anomalies} compatible={result.compatible} t={t} maxVisible={100} />
        </div>
      )}
    </div>
  );
}
