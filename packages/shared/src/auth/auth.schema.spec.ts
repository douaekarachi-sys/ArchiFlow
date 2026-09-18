import { describe, expect, it } from 'vitest';
import { authResultSchema, changePasswordSchema, createUserSchema, loginSchema } from './auth.schema.js';

const COMPANY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const base = {
  firstName: 'Salma',
  lastName: 'Bennani',
  email: '  Salma.Bennani@Example.MA ',
  temporaryPassword: 'provisoire-2026!',
};

describe('creation de compte (ADR 0010)', () => {
  it('normalise l’adresse e-mail', () => {
    const parsed = createUserSchema.parse({ ...base, role: 'CLIENT', clientCompanyId: COMPANY });
    expect(parsed.email).toBe('salma.bennani@example.ma');
  });

  it('exige une societe cliente pour un compte CLIENT', () => {
    expect(createUserSchema.safeParse({ ...base, role: 'CLIENT' }).success).toBe(false);
  });

  it('interdit une societe cliente pour un role interne', () => {
    const result = createUserSchema.safeParse({ ...base, role: 'ARCHITECT', clientCompanyId: COMPANY });
    expect(result.success).toBe(false);
  });

  it('refuse un role inexistant, dont « invite »', () => {
    expect(createUserSchema.safeParse({ ...base, role: 'invite' }).success).toBe(false);
  });

  it('refuse un mot de passe provisoire trop court', () => {
    const result = createUserSchema.safeParse({
      ...base,
      temporaryPassword: 'court',
      role: 'ENGINEER',
    });
    expect(result.success).toBe(false);
  });
});

describe('changement de mot de passe', () => {
  it('refuse un nouveau mot de passe identique a l’actuel', () => {
    const same = 'un-mot-de-passe-long';
    expect(changePasswordSchema.safeParse({ currentPassword: same, newPassword: same }).success).toBe(false);
  });
});

describe('jeton de rafraichissement', () => {
  it('n’apparait dans aucun corps de reponse d’authentification', () => {
    expect(Object.keys(authResultSchema.shape)).not.toContain('refreshToken');
  });

  it('la connexion n’accepte aucun champ de role venu du client', () => {
    const parsed = loginSchema.parse({ email: 'a@b.ma', password: 'x', role: 'ADMIN' });
    expect(parsed).not.toHaveProperty('role');
  });
});
