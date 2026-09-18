import { ROLES } from '@archiflow/shared';
import { describe, expect, it } from 'vitest';
import { BACKUP_POLICY, selectBackupsToKeep } from './backup/rotation';
import { ASSIGNABLE_ROLES, PROJECT_VISIBILITY, requiresAssignmentAs } from './projects/visibility';
import { RETENTION, retentionCutoffs } from './retention/policies';
import { anonymizedIdentity } from './users/anonymize';
import { checkRoleChange } from './users/role-change';

describe('anonymisation (ENF-02)', () => {
  const now = new Date('2026-09-18T10:00:00Z');
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('efface l’identité et conserve l’unicité de l’adresse', () => {
    const identity = anonymizedIdentity(id, now);
    expect(identity.email).toBe(`supprime+${id}@invalide.local`);
    expect(identity).toMatchObject({ firstName: 'Utilisateur', lastName: 'supprimé', anonymizedAt: now, deletedAt: now });
  });

  it('rend le mot de passe définitivement inutilisable (ce n’est pas une empreinte bcrypt)', () => {
    expect(anonymizedIdentity(id, now).passwordHash).not.toMatch(/^\$2[aby]\$/);
  });

  it('ne conserve aucune trace des données personnelles d’origine', () => {
    expect(JSON.stringify(anonymizedIdentity(id, now))).not.toMatch(/@(?!invalide\.local)/);
  });
});

describe('changement de rôle', () => {
  const base = { actorId: 'admin', targetId: 'u1', currentRole: 'SALES' as const };

  it('autorise un changement entre rôles internes', () => {
    expect(checkRoleChange({ ...base, newRole: 'ENGINEER' })).toBeNull();
  });
  it('refuse de modifier son propre rôle', () => {
    expect(checkRoleChange({ ...base, targetId: 'admin', newRole: 'ENGINEER' })).toBe('SELF_CHANGE');
  });
  it('refuse le passage client ↔ interne, dans les deux sens', () => {
    expect(checkRoleChange({ ...base, currentRole: 'CLIENT', newRole: 'ADMIN' })).toBe('CROSS_FAMILY');
    expect(checkRoleChange({ ...base, newRole: 'CLIENT' })).toBe('CROSS_FAMILY');
  });
  it('signale un changement sans effet', () => {
    expect(checkRoleChange({ ...base, newRole: 'SALES' })).toBe('UNCHANGED');
  });
});

describe('visibilité des projets', () => {
  it('définit une règle pour chaque rôle', () => {
    for (const role of ROLES) expect(PROJECT_VISIBILITY[role]).toBeDefined();
  });
  it('ADMIN voit tout le locataire, CLIENT sa société, les autres leurs affectations', () => {
    expect(PROJECT_VISIBILITY.ADMIN).toBe('ORGANIZATION');
    expect(PROJECT_VISIBILITY.CLIENT).toBe('CLIENT_COMPANY');
    for (const role of ['PROJECT_MANAGER', 'ENGINEER', 'ARCHITECT', 'SALES'] as const) {
      expect(PROJECT_VISIBILITY[role]).toBe('ASSIGNED');
      expect(requiresAssignmentAs(role)).toBe(true);
    }
  });
  it('les rôles affectables sont exactement ceux qui exigent une affectation', () => {
    expect([...ASSIGNABLE_ROLES].sort()).toEqual(ROLES.filter(requiresAssignmentAs).sort());
  });
});

describe('durées de conservation', () => {
  it('calcule les dates limites à partir de « maintenant »', () => {
    const now = new Date('2026-09-18T00:00:00Z');
    const cut = retentionCutoffs(now);
    expect(cut.auditLogBefore.toISOString()).toBe('2025-09-18T00:00:00.000Z');
    expect(cut.revokedRefreshTokenBefore.toISOString()).toBe('2026-09-11T00:00:00.000Z');
    expect(cut.expiredRefreshTokenBefore).toEqual(now);
  });
  it('conserve l’audit douze mois, comme annoncé dans RETENTION.md', () => {
    expect(RETENTION.auditLogDays).toBe(365);
  });
});

describe('rotation des sauvegardes (GFS)', () => {
  const daily = (count: number, from = '2026-09-18T02:00:00Z') =>
    Array.from({ length: count }, (_, i) => new Date(new Date(from).getTime() - i * 86_400_000));

  it('ne supprime rien tant qu’il y a moins de sept sauvegardes', () => {
    const dates = daily(5);
    expect(selectBackupsToKeep(dates).size).toBe(5);
  });

  it('garde toujours la sauvegarde la plus récente', () => {
    const dates = daily(400);
    expect(selectBackupsToKeep(dates).has(dates[0]!.getTime())).toBe(true);
  });

  it('borne le nombre de sauvegardes sur une année de sauvegardes quotidiennes', () => {
    const kept = selectBackupsToKeep(daily(400));
    // Au plus 7 + 4 + 12, moins les recouvrements entre règles.
    expect(kept.size).toBeLessThanOrEqual(BACKUP_POLICY.daily + BACKUP_POLICY.weekly + BACKUP_POLICY.monthly);
    expect(kept.size).toBeGreaterThanOrEqual(BACKUP_POLICY.monthly);
  });

  it('garde les sept derniers jours au complet', () => {
    const dates = daily(30);
    const kept = selectBackupsToKeep(dates);
    for (const d of dates.slice(0, 7)) expect(kept.has(d.getTime())).toBe(true);
  });

  it('garde une sauvegarde par mois sur douze mois', () => {
    const kept = [...selectBackupsToKeep(daily(400))].map((t) => new Date(t).toISOString().slice(0, 7));
    expect(new Set(kept).size).toBeGreaterThanOrEqual(12);
  });

  it('plusieurs sauvegardes le même jour : seule la plus récente compte pour ce jour', () => {
    const a = new Date('2026-09-18T02:00:00Z');
    const b = new Date('2026-09-18T14:00:00Z');
    const kept = selectBackupsToKeep([a, b]);
    expect(kept.has(b.getTime())).toBe(true);
    expect(kept.has(a.getTime())).toBe(false);
  });
});
