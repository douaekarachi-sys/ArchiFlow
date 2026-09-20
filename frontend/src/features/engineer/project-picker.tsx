import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ProjectStatusBadge } from '@/components/patterns/project-status';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useProjects } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';

/**
 * Sélecteur de projet pour un outil ingénieur par-projet (analyse du besoin, dimensionnement) :
 * ces outils n'ont de sens que pour un projet donné (comme le concepteur 2D), mais doivent
 * rester des destinations réelles du menu — pas de lien mort. `useProjects` ne renvoie déjà que
 * les projets affectés à l'ingénieur (ADR 0006 / visibilité par rôle).
 */
export function ProjectPicker({
  title,
  description,
  icon: Icon,
  basePath,
  linkSuffix,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Racine du portail (ex. `/engineer`) : les liens sont absolus, la page est montée hors de `projects/`. */
  basePath: string;
  linkSuffix: string;
}) {
  const { t } = useTranslation();
  const query = useProjects({ pageSize: 100 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} subtitle={description} />
      <section className="overflow-hidden rounded-card border border-line">
        {query.isPending ? (
          <div className="flex flex-col gap-2 p-4" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14" />)}
          </div>
        ) : query.isError ? (
          <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} className="p-6" />
        ) : query.data.data.length === 0 ? (
          <EmptyState icon={<Icon />} title={t('projects.empty.title')} description={t('projects.empty.default')} className="p-6" />
        ) : (
          <ul>
            {query.data.data.map((project) => (
              <li key={project.id} className="border-b border-line last:border-b-0">
                <Link
                  to={`${basePath}/projects/${project.id}/${linkSuffix}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-inset"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{project.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-fg-muted">{project.clientCompany.name}</span>
                  </span>
                  <ProjectStatusBadge status={project.status} />
                  <ChevronRight className="size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
