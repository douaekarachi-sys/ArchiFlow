import { describe, expect, it } from 'vitest';
import { assertOrgScoped, OrgScopeViolation } from './org-scope';

const ORG = '11111111-1111-1111-1111-111111111111';

describe('assertOrgScoped', () => {
  it('rejette une lecture sans filtre de locataire', () => {
    expect(() => assertOrgScoped('Project', 'findMany', {})).toThrow(OrgScopeViolation);
    expect(() => assertOrgScoped('Project', 'findMany', undefined)).toThrow(OrgScopeViolation);
    expect(() => assertOrgScoped('User', 'findUnique', { where: { email: 'a@b.ma' } })).toThrow(OrgScopeViolation);
  });

  it('accepte un filtre direct ou porté par un AND', () => {
    expect(() => assertOrgScoped('Project', 'findMany', { where: { organizationId: ORG } })).not.toThrow();
    expect(() =>
      assertOrgScoped('Project', 'count', { where: { AND: [{ id: 'x' }, { organizationId: ORG }] } }),
    ).not.toThrow();
    expect(() => assertOrgScoped('Project', 'findFirst', { where: { AND: { organizationId: ORG } } })).not.toThrow();
  });

  it('ne se laisse pas tromper par un filtre sur une relation', () => {
    expect(() =>
      assertOrgScoped('ProjectAssignment', 'findMany', { where: { project: { organizationId: ORG } } }),
    ).toThrow(OrgScopeViolation);
  });

  it('rejette une écriture de masse sans filtre', () => {
    expect(() => assertOrgScoped('Project', 'updateMany', { where: { id: 'x' }, data: {} })).toThrow(OrgScopeViolation);
    expect(() => assertOrgScoped('Project', 'deleteMany', {})).toThrow(OrgScopeViolation);
  });

  it('exige organizationId à la création, y compris en lot', () => {
    expect(() => assertOrgScoped('Project', 'create', { data: { name: 'x' } })).toThrow(OrgScopeViolation);
    expect(() => assertOrgScoped('Project', 'create', { data: { organizationId: ORG } })).not.toThrow();
    expect(() =>
      assertOrgScoped('ProjectAssignment', 'createMany', { data: [{ organizationId: ORG }, { userId: 'u' }] }),
    ).toThrow(OrgScopeViolation);
  });

  it('ignore les modèles hors locataire (données de référence, audit, jetons)', () => {
    for (const model of ['EquipmentCategory', 'AuditLog', 'RefreshToken', 'Organization']) {
      expect(() => assertOrgScoped(model, 'findMany', {})).not.toThrow();
    }
  });
});
