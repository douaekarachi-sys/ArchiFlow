import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@archiflow/shared';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  org: string;
}

/**
 * genererToken(idUtilisateur, role) du diagramme de séquence.
 *
 * Le rôle figure dans le jeton pour l'affichage, mais n'est PAS une autorité : le JwtAuthGuard
 * relit l'utilisateur en base à chaque requête. Un compte désactivé ou un rôle modifié prend
 * donc effet immédiatement, sans attendre l'expiration du jeton.
 */
@Injectable()
export class AccessTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  async verify(token: string): Promise<AccessTokenPayload | null> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      return null;
    }
  }
}
