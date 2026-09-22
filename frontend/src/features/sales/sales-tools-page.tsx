import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/page-header';
import { ProjectsPanel } from '../projects/projects-panel';

/**
 * Deux vues du portail Commercial (T16, point 2) — DÉRIVÉES de la liste de projets déjà
 * chargée (`useProjects`) et des transitions de workflow déjà en place (T10, EF-508) : aucun
 * nouveau modèle, aucune nouvelle route. « Propositions » et « Publication client » sont deux
 * angles sur le MÊME cycle de vie projet, filtrés par statut.
 */

/** Projets pour lesquels une proposition a déjà été publiée au client, à un stade ou un autre. */
export function ProposalsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.proposals')} subtitle={t('salesTools.proposalsSubtitle')} />
      <ProjectsPanel
        role="SALES"
        statuses={['CLIENT_REVIEW', 'CLIENT_COMMENTS', 'REVISION', 'CLIENT_APPROVED']}
        title={t('nav.proposals')}
        subtitle={t('salesTools.proposalsListSubtitle')}
        emptyTitle={t('salesTools.proposalsEmpty')}
        emptyDescription={t('salesTools.proposalsEmptyHint')}
      />
    </div>
  );
}

/** File d'attente : projets validés en interne, prêts à être publiés au client (transition existante). */
export function ClientPublishPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.clientPublish')} subtitle={t('salesTools.publishSubtitle')} />
      <ProjectsPanel
        role="SALES"
        statuses={['COMMERCIAL_REVIEW']}
        title={t('nav.clientPublish')}
        subtitle={t('salesTools.publishListSubtitle')}
        emptyTitle={t('salesTools.publishEmpty')}
        emptyDescription={t('salesTools.publishEmptyHint')}
      />
    </div>
  );
}
