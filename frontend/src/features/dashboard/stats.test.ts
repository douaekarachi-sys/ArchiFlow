import { PROJECT_STATUSES, ROLES, type ProjectStatus } from '@archiflow/shared';
import { describe, expect, it } from 'vitest';
import fr from '@/i18n/locales/fr.json';
import { dashboardStats } from './stats';

const projects = (...statuses: ProjectStatus[]) => statuses.map((status) => ({ status }));

describe('indicateurs du tableau de bord', () => {
  it('l’administrateur voit le total, l’en-cours, l’attente, les terminés et les utilisateurs actifs', () => {
    const stats = dashboardStats('ADMIN', projects('DRAFT', 'SUBMITTED', 'PENDING_ASSIGNMENT', 'ARCHITECTURE', 'COMPLETED'), {
      activeUsers: 9,
    });
    expect(Object.fromEntries(stats.map((s) => [s.key, s.value]))).toEqual({
      total: 5,
      inProgress: 3,
      pending: 2,
      completed: 1,
      activeUsers: 9,
    });
  });

  it('le client voit d’abord ce qui attend SA validation', () => {
    const stats = dashboardStats('CLIENT', projects('CLIENT_REVIEW', 'CLIENT_REVIEW', 'ENGINEERING', 'CLIENT_APPROVED'));
    expect(stats[1]).toEqual({ key: 'awaitingMyDecision', value: 2, tone: 'warning' });
  });

  it('un brouillon n’est pas « en cours »', () => {
    const inProgress = dashboardStats('ADMIN', projects('DRAFT')).find((s) => s.key === 'inProgress');
    expect(inProgress?.value).toBe(0);
  });

  it('tout indicateur de tout rôle a son libellé traduit', () => {
    for (const role of ROLES) {
      for (const stat of dashboardStats(role, projects(...PROJECT_STATUSES), { activeUsers: 1 })) {
        expect(fr.dashboard.stats, `${role} / ${stat.key}`).toHaveProperty(stat.key);
      }
    }
  });
});
