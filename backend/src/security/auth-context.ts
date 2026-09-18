import type { AuthContext } from '@archiflow/shared';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & { auth?: AuthContext };
