import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_HOME,
  type AuthContext,
  type AuthResult,
  type ChangePasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type UserProfile,
} from '@archiflow/shared';
import { AppError, invalidCredentials } from '../../common/errors/app-error';
import { ENV, type Env } from '../../core/config/env';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { User } from '../../generated/prisma/client';
import { PasswordHasher } from '../../security/hashing/password-hasher';
import { AccessTokenService } from '../../security/tokens/access-token.service';
import { generateOpaqueToken, hashOpaqueToken } from '../../security/tokens/opaque-token';
import { AuditService } from '../audit/audit.service';
import { Mailer } from '../mail/mailer';

export const CHANGE_PASSWORD_PATH = '/change-password';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Résultat interne : le jeton de rafraîchissement part en cookie, jamais dans le JSON. */
export interface Session {
  body: AuthResult;
  refreshToken: string;
}

const sessionExpired = () => new AppError('SESSION_EXPIRED', 'Session expirée');

export function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    clientCompanyId: user.clientCompanyId,
    mustChangePassword: user.mustChangePassword,
  };
}

const isActive = (user: Pick<User, 'deletedAt' | 'anonymizedAt'>) => !user.deletedAt && !user.anonymizedAt;

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    private readonly audit: AuditService,
    private readonly mailer: Mailer,
  ) {}

  // --- Connexion — diagramme « API gestion des comptes », scénario 2 ------------------------

  async login(input: LoginInput): Promise<Session> {
    const user = await this.findAccount(input.email);

    // [compte introuvable] et [mot de passe invalide] : même message, même code, même coût.
    if (!user || !isActive(user)) {
      await this.hasher.burnVerification(input.password);
      throw invalidCredentials();
    }
    if (!(await this.verifyPassword(input.password, user.passwordHash))) {
      await this.audit.record(user.organizationId ? { userId: user.id, organizationId: user.organizationId } : null, {
        action: 'auth.login.failed',
        targetType: 'user',
        targetId: user.id,
      });
      throw invalidCredentials();
    }

    const updated = await this.prisma.system.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.record({ userId: user.id, organizationId: user.organizationId }, {
      action: 'auth.login',
      targetType: 'user',
      targetId: user.id,
    });
    return this.generateTokens(updated);
  }

  /** rechercherCompte(email) */
  private findAccount(email: string): Promise<User | null> {
    return this.prisma.system.user.findUnique({ where: { email } });
  }

  /** verifierMotDePasse(motDePasse, hash) */
  private verifyPassword(password: string, hash: string): Promise<boolean> {
    return this.hasher.verify(password, hash);
  }

  /** genererToken(idUtilisateur, role) — ouvre une nouvelle famille de jetons de rafraîchissement. */
  private async generateTokens(user: User, familyId: string = randomUUID()): Promise<Session> {
    const { token, hash } = generateOpaqueToken();
    await this.prisma.system.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
      },
    });
    const accessToken = await this.accessTokens.sign({ sub: user.id, role: user.role, org: user.organizationId });
    return {
      refreshToken: token,
      body: {
        accessToken,
        profile: toProfile(user),
        redirectTo: user.mustChangePassword ? CHANGE_PASSWORD_PATH : ROLE_HOME[user.role],
      },
    };
  }

  // --- Rafraîchissement : rotation à chaque usage, détection de réutilisation ---------------

  async refresh(refreshToken: string | undefined): Promise<Session> {
    if (!refreshToken) throw sessionExpired();
    const stored = await this.prisma.system.refreshToken.findUnique({
      where: { tokenHash: hashOpaqueToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) throw sessionExpired();

    if (stored.revokedAt) {
      // Un jeton déjà échangé qui revient : il a été volé ou rejoué. Toute la famille tombe.
      if (stored.replacedAt) await this.revokeFamily(stored.familyId, stored.user, 'auth.refresh.reuse_detected');
      throw sessionExpired();
    }
    if (stored.expiresAt.getTime() <= Date.now() || !isActive(stored.user)) throw sessionExpired();

    // Consommation atomique : deux requêtes concurrentes ne peuvent pas échanger le même jeton.
    const now = new Date();
    const consumed = await this.prisma.system.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: now, replacedAt: now },
    });
    if (consumed.count === 0) {
      await this.revokeFamily(stored.familyId, stored.user, 'auth.refresh.reuse_detected');
      throw sessionExpired();
    }
    return this.generateTokens(stored.user, stored.familyId);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const stored = await this.prisma.system.refreshToken.findUnique({
      where: { tokenHash: hashOpaqueToken(refreshToken) },
      include: { user: true },
    });
    if (stored) await this.revokeFamily(stored.familyId, stored.user, 'auth.logout');
  }

  private async revokeFamily(familyId: string, user: User, action: string): Promise<void> {
    await this.prisma.system.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({ userId: user.id, organizationId: user.organizationId }, {
      action,
      targetType: 'user',
      targetId: user.id,
    });
  }

  /** Révoque toutes les sessions d'un utilisateur (désactivation, changement de mot de passe). */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.system.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // --- Mot de passe -----------------------------------------------------------------------

  async me(ctx: AuthContext): Promise<UserProfile> {
    const user = await this.prisma.system.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    return toProfile(user);
  }

  async changePassword(ctx: AuthContext, input: ChangePasswordInput): Promise<Session> {
    const user = await this.prisma.system.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    if (!(await this.verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new AppError('VALIDATION_FAILED', 'Mot de passe actuel incorrect', [
        { path: 'currentPassword', message: 'Mot de passe actuel incorrect' },
      ]);
    }
    const updated = await this.setPassword(user.id, input.newPassword);
    await this.audit.record(ctx, { action: 'auth.password.changed', targetType: 'user', targetId: user.id });
    return this.generateTokens(updated);
  }

  /**
   * Réponse identique que l'adresse existe ou non : la demande ne révèle rien.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.findAccount(email);
    if (!user || !isActive(user)) return;

    const { token, hash } = generateOpaqueToken();
    await this.prisma.system.$transaction([
      this.prisma.system.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.system.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      }),
    ]);
    await this.mailer.send({
      to: user.email,
      subject: 'ArchiFlow — réinitialisation de votre mot de passe',
      text: `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :\n${this.env.APP_PUBLIC_URL}/reset-password?token=${token}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    });
    await this.audit.record({ userId: user.id, organizationId: user.organizationId }, {
      action: 'auth.password.reset_requested',
      targetType: 'user',
      targetId: user.id,
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const stored = await this.prisma.system.passwordResetToken.findUnique({
      where: { tokenHash: hashOpaqueToken(input.token) },
      include: { user: true },
    });
    const invalid = new AppError('UNPROCESSABLE', 'Lien de réinitialisation invalide ou expiré');
    if (!stored || stored.usedAt || stored.expiresAt.getTime() <= Date.now() || !isActive(stored.user)) throw invalid;

    const consumed = await this.prisma.system.passwordResetToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) throw invalid;

    await this.setPassword(stored.userId, input.newPassword);
    await this.audit.record({ userId: stored.userId, organizationId: stored.user.organizationId }, {
      action: 'auth.password.reset',
      targetType: 'user',
      targetId: stored.userId,
    });
  }

  private async setPassword(userId: string, password: string): Promise<User> {
    const passwordHash = await this.hasher.hash(password);
    const user = await this.prisma.system.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
    });
    await this.revokeAllSessions(userId);
    return user;
  }
}
