import type { AuthResult } from '@archiflow/shared';
import { useSession } from '@/auth/session-store';

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

/** Erreur d'API normalisée : `code` est stable et traduisible (errors.<code>). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Faux pour les routes publiques : aucune tentative de rafraîchissement sur 401. */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const token = useSession.getState().accessToken;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth !== false && token) headers['Authorization'] = `Bearer ${token}`;
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK', 'Serveur injoignable');
  }
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
  return new ApiError(res.status, body?.error?.code ?? 'INTERNAL', body?.error?.message ?? res.statusText, body?.error?.details);
}

// ---------------------------------------------------------------------------------------------
// Rafraîchissement de session : UNE seule requête en vol, partagée par tous les appels en échec.
// Sans cette mutualisation, deux requêtes échangeraient le même jeton : le serveur y verrait
// une réutilisation et révoquerait la session (rotation avec détection de réutilisation).
// ---------------------------------------------------------------------------------------------
let refreshing: Promise<AuthResult | null> | null = null;

export function refreshSession(): Promise<AuthResult | null> {
  refreshing ??= (async () => {
    try {
      const res = await send('/auth/refresh', { method: 'POST', auth: false });
      if (!res.ok) {
        useSession.getState().clear();
        return null;
      }
      const result = (await res.json()) as AuthResult;
      useSession.getState().setSession(result);
      return result;
    } catch {
      useSession.getState().clear();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

const RETRYABLE = new Set(['UNAUTHENTICATED', 'SESSION_EXPIRED']);

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options);

  if (res.status === 401 && options.auth !== false) {
    const error = await toError(res);
    if (!RETRYABLE.has(error.code)) throw error;
    const renewed = await refreshSession();
    if (!renewed) throw error;
    res = await send(path, options);
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => apiRequest<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, auth = true) => apiRequest<T>(path, { method: 'POST', body, auth }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
