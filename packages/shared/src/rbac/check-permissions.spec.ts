import { describe, expect, it } from 'vitest';
import { checkPermissions, hasPermission, type AuthContext } from './check-permissions';
import { PERMISSION_MATRIX, PERMISSIONS } from './permissions';
import { ROLES } from './roles';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const CLIENT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CLIENT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const architect: AuthContext = {
  userId: 'u1',
  role: 'ARCHITECT',
  organizationId: ORG_A,
  clientCompanyId: null,
};

const client: AuthContext = {
  userId: 'u2',
  role: 'CLIENT',
  organizationId: ORG_A,
  clientCompanyId: CLIENT_A,
};

describe('matrice de permissions', () => {
  it('ADMIN possede toutes les permissions', () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission('ADMIN', permission)).toBe(true);
    }
  });

  it('chaque role a une entree dans la matrice', () => {
    for (const role of ROLES) {
      expect(PERMISSION_MATRIX[role]).toBeDefined();
    }
  });

  it("l'architecte edite l'architecture, le commercial non", () => {
    expect(hasPermission('ARCHITECT', 'architecture.edit')).toBe(true);
    expect(hasPermission('SALES', 'architecture.edit')).toBe(false);
  });

  it('le client ne modifie jamais la conception technique', () => {
    expect(hasPermission('CLIENT', 'architecture.read')).toBe(true);
    expect(hasPermission('CLIENT', 'architecture.edit')).toBe(false);
    expect(hasPermission('CLIENT', 'sizing.edit')).toBe(false);
    expect(hasPermission('CLIENT', 'catalog.manage')).toBe(false);
  });

  it("seul l'administrateur change un role ou lit l'audit", () => {
    for (const role of ROLES) {
      const expected = role === 'ADMIN';
      expect(hasPermission(role, 'user.changeRole')).toBe(expected);
      expect(hasPermission(role, 'audit.read')).toBe(expected);
    }
  });
});

describe('isolation — niveau locataire (ADR 0006)', () => {
  it('refuse une ressource appartenant a un autre locataire', () => {
    const result = checkPermissions(architect, 'architecture.read', { organizationId: ORG_B });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('locataire');
  });

  it('autorise une ressource du meme locataire', () => {
    expect(
      checkPermissions(architect, 'architecture.read', { organizationId: ORG_A }).allowed,
    ).toBe(true);
  });
});

describe('isolation — niveau societe cliente (ADR 0006)', () => {
  it("refuse a un CLIENT un projet d'une autre societe DANS LE MEME locataire", () => {
    const result = checkPermissions(client, 'project.read', {
      organizationId: ORG_A,
      clientCompanyId: CLIENT_B,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('societe cliente');
  });

  it('autorise un CLIENT sur un projet de sa societe', () => {
    expect(
      checkPermissions(client, 'project.read', {
        organizationId: ORG_A,
        clientCompanyId: CLIENT_A,
      }).allowed,
    ).toBe(true);
  });

  it('est transparent pour un role interne, qui voit toutes les societes du locataire', () => {
    expect(
      checkPermissions(architect, 'project.read', {
        organizationId: ORG_A,
        clientCompanyId: CLIENT_B,
      }).allowed,
    ).toBe(true);
  });

  it('refuse un CLIENT sans societe rattachee', () => {
    const orphan: AuthContext = { ...client, clientCompanyId: null };
    const result = checkPermissions(orphan, 'project.read', {
      organizationId: ORG_A,
      clientCompanyId: CLIENT_A,
    });
    expect(result.allowed).toBe(false);
  });
});
