import { Building2, Network, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectRequest } from '@/api/endpoints';
import { Alert } from '@/components/ui/alert';

/** Besoin exprimé par le client (EF-507), en lecture — partagé par le détail projet et l'analyse du besoin (ingénieur). */
export function RequestOverview({ request }: { request: ProjectRequest | null }) {
  const { t } = useTranslation();
  if (!request) return <Alert tone="info">{t('projects.detail.noRequest')}</Alert>;
  const yesNo = (value: boolean | null) => (value === true ? t('common.yes') : value === false ? t('common.no') : t('common.none'));
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-inset p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Network className="size-4 text-primary" />
          {t('projects.detail.requestTitle')}
        </h3>
        <span className="text-xs text-fg-muted">{request.location ?? t('common.none')}</span>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <RequestMetric icon={<Users />} label={t('request.fields.employees')} value={request.totalEmployees ?? '-'} />
        <RequestMetric icon={<Users />} label={t('request.fields.workstations')} value={request.workstationCount ?? '-'} />
        <RequestMetric icon={<Network />} label={t('request.fields.siteCount')} value={request.siteCount ?? '-'} />
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="text-fg-secondary">{t('request.fields.wifi')}</span>
          <span className="font-medium text-fg">{yesNo(request.wifi)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="text-fg-secondary">{t('request.fields.vpn')}</span>
          <span className="font-medium text-fg">{yesNo(request.vpn)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="text-fg-secondary">{t('request.fields.firewall')}</span>
          <span className="font-medium text-fg">{yesNo(request.firewall)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="text-fg-secondary">{t('request.fields.vlan')}</span>
          <span className="font-medium text-fg">{yesNo(request.vlan)}</span>
        </div>
      </div>
      {(request.buildings.length > 0 || request.departments.length > 0) && (
        <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-fg">
              <Building2 className="size-3.5" />
              {t('projects.detail.buildings')}
            </h4>
            <ul className="flex flex-col gap-1 text-xs text-fg-secondary">
              {request.buildings.map((building) => (
                <li key={building.id}>
                  {building.name}
                  {building.floors ? ` · ${building.floors} ${t('projects.detail.floors')}` : ''}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-fg">
              <ShieldCheck className="size-3.5" />
              {t('projects.detail.departments')}
            </h4>
            <ul className="flex flex-col gap-1 text-xs text-fg-secondary">
              {request.departments.map((department) => (
                <li key={department.id}>
                  {department.name}
                  {department.employees ? ` · ${department.employees} ${t('request.fields.employees').toLowerCase()}` : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {request.freeTextNeed && <p className="border-t border-line pt-3 text-sm text-fg-secondary">{request.freeTextNeed}</p>}
    </section>
  );
}

function RequestMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2 rounded-field border border-line bg-surface p-2.5">
      <span className="text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-fg-muted">{label}</span>
        <strong className="text-fg">{value}</strong>
      </span>
    </div>
  );
}
