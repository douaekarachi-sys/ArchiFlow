import { Injectable, Logger, Module } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../core/prisma/prisma.service';
import { retentionCutoffs } from '../domain/retention/policies';

export interface RetentionReport {
  auditLogs: number;
  refreshTokens: number;
  passwordResetTokens: number;
  inactiveAccountsToReview: number;
}

/**
 * Application quotidienne des durées de conservation (ENF-02, docs/RETENTION.md).
 * Idempotente. Journalise des VOLUMES, jamais des contenus.
 * Les comptes inactifs sont signalés, jamais effacés automatiquement : l'anonymisation est une
 * décision d'administrateur, irréversible.
 */
@Injectable()
export class RetentionWorker {
  private readonly logger = new Logger('RetentionWorker');

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *', { name: 'retention', timeZone: 'Africa/Casablanca' })
  async scheduled(): Promise<void> {
    const report = await this.run(new Date());
    this.logger.log(
      `Rétention : ${report.auditLogs} entrées d'audit, ${report.refreshTokens} jetons de session, ` +
        `${report.passwordResetTokens} jetons de réinitialisation purgés ; ` +
        `${report.inactiveAccountsToReview} comptes inactifs à revoir`,
    );
  }

  async run(now: Date): Promise<RetentionReport> {
    const cut = retentionCutoffs(now);
    const db = this.prisma.system;
    const [audit, refresh, reset, inactive] = await Promise.all([
      db.auditLog.deleteMany({ where: { createdAt: { lt: cut.auditLogBefore } } }),
      db.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: cut.expiredRefreshTokenBefore } },
            { revokedAt: { lt: cut.revokedRefreshTokenBefore } },
          ],
        },
      }),
      db.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: cut.passwordResetTokenBefore } }, { usedAt: { lt: cut.passwordResetTokenBefore } }],
        },
      }),
      db.user.count({
        where: {
          deletedAt: null,
          anonymizedAt: null,
          OR: [
            { lastLoginAt: { lt: cut.inactiveAccountBefore } },
            { lastLoginAt: null, createdAt: { lt: cut.inactiveAccountBefore } },
          ],
        },
      }),
    ]);
    return {
      auditLogs: audit.count,
      refreshTokens: refresh.count,
      passwordResetTokens: reset.count,
      inactiveAccountsToReview: inactive,
    };
  }
}

@Module({ providers: [RetentionWorker], exports: [RetentionWorker] })
export class WorkersModule {}
