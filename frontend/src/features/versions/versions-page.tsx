import { GitBranch, History, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROLE_HOME, type ArchitectureDiff, type Role } from '@archiflow/shared';
import { architectureApi } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDestructive } from '@/components/ui/confirm-destructive';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useProject } from '@/hooks/use-projects';
import { useCan } from '@/permissions/portals';
import { errorMessage } from '@/utils/errors';
import { ProjectPicker } from '../projects/project-picker';

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

/** Point d'entrée du menu (EF-405) : la liste des projets visibles, un historique par projet. */
export function VersionsPickerPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  return (
    <ProjectPicker
      title={t('nav.versions')}
      description={t('versions.pickerDescription')}
      icon={GitBranch}
      basePath={ROLE_HOME[role]}
      linkSuffix="versions"
    />
  );
}

/** Historique, comparaison sémantique et restauration (EF-405, ADR 0001) — snapshot auto-porteur. */
export function VersionsDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const canRestore = useCan('architecture.edit');
  const project = useProject(projectId ?? null);
  const queryClient = useQueryClient();
  const versions = useQuery({
    queryKey: ['architecture', 'versions', projectId],
    queryFn: () => architectureApi.versions(projectId!),
    enabled: !!projectId,
  });

  const numbers = useMemo(() => (versions.data ?? []).map((v) => v.number).sort((a, b) => a - b), [versions.data]);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const effectiveTo = to ?? numbers[numbers.length - 1] ?? null;
  const effectiveFrom = from ?? (numbers.length > 1 ? numbers[numbers.length - 2]! : 0);

  const diff = useQuery({
    queryKey: ['architecture', 'diff', projectId, effectiveFrom, effectiveTo],
    queryFn: () => architectureApi.diff(projectId!, effectiveFrom, effectiveTo!),
    enabled: !!projectId && effectiveTo != null,
  });

  const restore = useMutation({
    mutationFn: (number: number) => architectureApi.restore(projectId!, number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['architecture', 'versions', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['architecture', projectId] });
    },
  });

  if (!projectId) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={project.data?.name ?? t('nav.versions')} subtitle={t('versions.detailDescription')} />

      {versions.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </div>
      ) : versions.isError ? (
        <ErrorState message={errorMessage(t, versions.error)} onRetry={() => void versions.refetch()} />
      ) : versions.data.length === 0 ? (
        <EmptyState icon={<History />} title={t('versions.empty')} description={t('versions.emptyHint')} className="py-16" />
      ) : (
        <>
          <Panel title={t('versions.compareTitle')}>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <VersionSelect label={t('versions.compareFrom')} value={effectiveFrom} onChange={setFrom} numbers={numbers} allowOrigin />
              <VersionSelect label={t('versions.compareTo')} value={effectiveTo} onChange={setTo} numbers={numbers} />
            </div>
            <div className="border-t border-line p-4">
              {diff.isPending ? (
                <Skeleton className="h-10" />
              ) : diff.isError ? (
                <ErrorState message={errorMessage(t, diff.error)} onRetry={() => void diff.refetch()} />
              ) : (
                <DiffSummary diff={diff.data} />
              )}
            </div>
          </Panel>

          <Panel title={t('versions.historyTitle')}>
            <ul>
              {versions.data.map((version) => (
                <li key={version.number} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-text">
                    {version.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-fg">
                        {version.author ? `${version.author.firstName} ${version.author.lastName}` : t('common.none')}
                      </span>
                      {version.restoredFromVersion != null && (
                        <Badge tone="info">{t('versions.restoredFrom', { number: version.restoredFromVersion })}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted">{dateTime.format(new Date(version.createdAt))}</p>
                  </div>
                  {canRestore && (
                    <ConfirmDestructive
                      action={t('versions.restoreAction')}
                      target={t('versions.restoreTarget', { number: version.number })}
                      consequence={t('versions.restoreConsequence')}
                      trigger={
                        <Button variant="ghost" size="sm" icon={<RotateCcw />} loading={restore.isPending && restore.variables === version.number}>
                          {t('versions.restoreAction')}
                        </Button>
                      }
                      onConfirm={() => restore.mutateAsync(version.number)}
                    />
                  )}
                </li>
              ))}
            </ul>
            {restore.isError && (
              <p className="border-t border-line p-3 text-sm text-critical-text">{errorMessage(t, restore.error)}</p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function VersionSelect({
  label,
  value,
  onChange,
  numbers,
  allowOrigin,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  numbers: number[];
  allowOrigin?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <label className="flex items-center gap-2 text-sm text-fg-secondary">
      {label}
      <Select value={String(value ?? '')} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {allowOrigin && <SelectItem value="0">{t('versions.origin')}</SelectItem>}
          {numbers.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {t('versions.versionLabel', { number: n })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function DiffSummary({ diff }: { diff: ArchitectureDiff }) {
  const { t } = useTranslation();
  const hasChanges =
    diff.elements.length > 0 || diff.connectionsAdded > 0 || diff.connectionsRemoved > 0 || diff.zonesAdded > 0 || diff.zonesRemoved > 0;

  if (!hasChanges) return <p className="text-sm text-fg-secondary">{t('versions.noDiff')}</p>;

  return (
    <ul className="flex flex-wrap gap-2">
      {diff.elements.map((change) => (
        <li key={change.category} className="flex flex-col gap-1 rounded-field border border-line bg-inset px-3 py-2 text-sm">
          <span className="font-medium text-fg">{t(`equipment.category.${change.category}`, { defaultValue: change.category })}</span>
          <span className="flex gap-2 text-xs">
            {change.added > 0 && <span className="text-success-text">+{change.added}</span>}
            {change.removed > 0 && <span className="text-critical-text">−{change.removed}</span>}
            {change.changed > 0 && <span className="text-warning-text">{t('versions.changedCount', { count: change.changed })}</span>}
          </span>
        </li>
      ))}
      {diff.connectionsAdded + diff.connectionsRemoved > 0 && (
        <li className="flex flex-col gap-1 rounded-field border border-line bg-inset px-3 py-2 text-sm">
          <span className="font-medium text-fg">{t('versions.connections')}</span>
          <span className="flex gap-2 text-xs">
            {diff.connectionsAdded > 0 && <span className="text-success-text">+{diff.connectionsAdded}</span>}
            {diff.connectionsRemoved > 0 && <span className="text-critical-text">−{diff.connectionsRemoved}</span>}
          </span>
        </li>
      )}
      {diff.zonesAdded + diff.zonesRemoved > 0 && (
        <li className="flex flex-col gap-1 rounded-field border border-line bg-inset px-3 py-2 text-sm">
          <span className="font-medium text-fg">{t('versions.zones')}</span>
          <span className="flex gap-2 text-xs">
            {diff.zonesAdded > 0 && <span className="text-success-text">+{diff.zonesAdded}</span>}
            {diff.zonesRemoved > 0 && <span className="text-critical-text">−{diff.zonesRemoved}</span>}
          </span>
        </li>
      )}
    </ul>
  );
}
