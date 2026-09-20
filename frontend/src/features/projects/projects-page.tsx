import type { Role } from '@archiflow/shared';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectsPanel } from './projects-panel';

/**
 * Liste complète des projets visibles par le rôle — mêmes données que le tableau de bord
 * (ProjectsPanel), en page dédiée. Existe parce que la donnée existe déjà : un lien grisé vers
 * une fonctionnalité déjà réelle serait plus trompeur qu'utile.
 */
export function ProjectsPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-fg">{t('projects.title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('projects.subtitle')}</p>
      </header>
      <label className="relative block max-w-sm">
        <span className="sr-only">{t('dashboard.search')}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('dashboard.search')}
          className="h-9 w-full rounded-field border border-line bg-inset pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted"
        />
      </label>
      <ProjectsPanel role={role} search={search} />
    </div>
  );
}
