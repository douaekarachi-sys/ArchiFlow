import type { TFunction } from 'i18next';
import { ApiError } from '@/api/client';

/** Message traduit d'une erreur quelconque : le code d'API fait foi, jamais le texte du serveur. */
export function errorMessage(t: TFunction, error: unknown): string {
  const code = error instanceof ApiError ? error.code : 'INTERNAL';
  return t(`errors.${code}`, { defaultValue: t('errors.INTERNAL') });
}

/** Les messages de validation des schémas partagés sont des clés i18n (« validation.email.invalid »). */
export function validationMessage(t: TFunction, message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message.startsWith('validation.') ? t(message) : message;
}
