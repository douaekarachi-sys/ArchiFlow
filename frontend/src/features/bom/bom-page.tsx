import { Download, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Role } from '@archiflow/shared';
import { ROLE_HOME } from '@archiflow/shared';
import { bomApi, reportsApi } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { MultiColumnStat } from '@/components/ui/multi-column-stat';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useProject } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';
import { ProjectPicker } from '../projects/project-picker';

const money = (value: number, currency: string | null) =>
  new Intl.NumberFormat('fr-FR', { style: currency ? 'currency' : 'decimal', currency: currency ?? undefined, maximumFractionDigits: 0 }).format(value);

/** Point d'entrée du menu (EF-302/303) : la liste des projets visibles, un BOM par projet. */
export function BomPickerPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  return (
    <ProjectPicker title={t('nav.bom')} description={t('bom.pickerDescription')} icon={FileSpreadsheet} basePath={ROLE_HOME[role]} linkSuffix="bom" />
  );
}

/** BOM et coûts (EF-302, EF-303) : dérivés de l'architecture, jamais saisis à la main. */
export function BomDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const project = useProject(projectId ?? null);
  const bom = useQuery({ queryKey: ['bom', projectId], queryFn: () => bomApi.get(projectId!), enabled: !!projectId });
  const pdf = useMutation({
    mutationFn: () => reportsApi.downloadPdf(projectId!),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `architecture-${projectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project.data?.name ?? t('nav.bom')}
        subtitle={t('bom.detailDescription')}
        action={
          <Button icon={<Download />} variant="secondary" loading={pdf.isPending} onClick={() => pdf.mutate()}>
            {t('bom.downloadPdf')}
          </Button>
        }
      />
      {pdf.isError && <ErrorState message={errorMessage(t, pdf.error)} onRetry={() => pdf.mutate()} />}
      {bom.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      ) : bom.isError ? (
        <ErrorState message={errorMessage(t, bom.error)} onRetry={() => void bom.refetch()} />
      ) : bom.data.lines.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet />} title={t('bom.empty')} description={t('bom.emptyHint')} className="py-16" />
      ) : (
        <>
          <MultiColumnStat
            columns={[
              { key: 'material', label: t('bom.materialTotal'), value: money(bom.data.materialTotal, bom.data.currency) },
              { key: 'license', label: t('bom.licenseTotal'), value: money(bom.data.licenseTotal, bom.data.currency) },
              { key: 'implementation', label: t('bom.implementationTotal'), value: t('bom.notEstimated'), detail: <span className="text-xs text-fg-muted">{t('bom.implementationHint')}</span> },
              { key: 'grand', label: t('bom.grandTotal'), value: money(bom.data.grandTotal, bom.data.currency) },
            ]}
          />
          {bom.data.unpricedElementCount > 0 && (
            <p className="text-sm text-fg-secondary">{t('bom.unpriced', { count: bom.data.unpricedElementCount })}</p>
          )}
          <Panel title={t('bom.linesTitle')}>
            <Table>
              <THead>
                <Tr>
                  <Th>{t('bom.columns.name')}</Th>
                  <Th>{t('bom.columns.category')}</Th>
                  <Th>{t('bom.columns.quantity')}</Th>
                  <Th>{t('bom.columns.unitPrice')}</Th>
                  <Th>{t('bom.columns.subtotal')}</Th>
                  <Th>{t('bom.columns.license')}</Th>
                </Tr>
              </THead>
              <TBody>
                {bom.data.lines.map((line) => (
                  <Tr key={line.equipmentModelId}>
                    <Td>
                      <span className="font-medium text-fg">{line.name}</span>
                      <span className="ml-2 font-mono text-xs text-fg-muted">{line.reference}</span>
                    </Td>
                    <Td>{t(`equipment.category.${line.category}`, { defaultValue: line.category })}</Td>
                    <Td className="tabular">{line.quantity}</Td>
                    <Td className="tabular">{line.unitPrice != null ? money(line.unitPrice, line.currency) : t('bom.notPriced')}</Td>
                    <Td className="tabular">
                      {line.subtotal != null ? (
                        <span title={t('bom.subtotalDetail', { quantity: line.quantity, unitPrice: money(line.unitPrice!, line.currency) })}>
                          {money(line.subtotal, line.currency)}
                        </span>
                      ) : (
                        t('bom.notPriced')
                      )}
                    </Td>
                    <Td className="tabular">{line.licenseSubtotal != null ? money(line.licenseSubtotal, line.currency) : '—'}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Panel>
        </>
      )}
    </div>
  );
}
