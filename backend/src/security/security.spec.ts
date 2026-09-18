import { describe, expect, it } from 'vitest';
import { loadEnv } from '../core/config/env';
import { generateOpaqueToken, hashOpaqueToken } from './tokens/opaque-token';

describe('jetons opaques', () => {
  it('produit 256 bits d’aléa, jamais deux fois le même jeton', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateOpaqueToken().token));
    expect(tokens.size).toBe(200);
    expect(Buffer.from(generateOpaqueToken().token, 'base64url')).toHaveLength(32);
  });

  it('l’empreinte est déterministe et ne contient pas le jeton', () => {
    const { token, hash } = generateOpaqueToken();
    expect(hashOpaqueToken(token)).toBe(hash);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
  });
});

describe('configuration', () => {
  const valid = {
    DATABASE_URL: 'postgresql://u@localhost:5432/db',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
  };

  it('refuse un secret JWT trop court', () => {
    expect(() => loadEnv({ ...valid, JWT_ACCESS_SECRET: 'court' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('ne divulgue jamais la valeur d’un secret dans son message d’erreur', () => {
    try {
      loadEnv({ ...valid, JWT_ACCESS_SECRET: 'secret-tres-court' });
    } catch (error) {
      expect(String(error)).not.toContain('secret-tres-court');
    }
  });

  it('refuse un coût bcrypt affaibli en production', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: 'production', BCRYPT_ROUNDS: '4' })).toThrow(/BCRYPT_ROUNDS/);
  });

  it('applique des défauts sûrs', () => {
    const env = loadEnv(valid);
    expect(env).toMatchObject({ BCRYPT_ROUNDS: 12, JWT_ACCESS_TTL: '15m', REFRESH_TOKEN_TTL_DAYS: 30, MAIL_TRANSPORT: 'disabled' });
  });
});
