import { Controller, Get, HttpStatus, Inject, Module, Res } from '@nestjs/common';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Response } from 'express';
import { ENV, type Env } from '../../core/config/env';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Public } from '../../security/decorators';

interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  database: 'ok' | 'down';
  backup: { configured: boolean; lastBackupAgeHours: number | null; stale: boolean };
}

/**
 * Supervision minimale (ENF-04) : base joignable et âge de la dernière sauvegarde.
 * Une sauvegarde trop ancienne rend l'état « degraded » : sans alerte, la panne de sauvegarde
 * se découvre le jour de la restauration.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthReport> {
    const database = await this.prisma.system
      .$queryRaw`SELECT 1`.then(() => 'ok' as const)
      .catch(() => 'down' as const);
    const backup = await this.backupState();
    const status = database === 'down' ? 'down' : backup.stale ? 'degraded' : 'ok';
    res.status(database === 'down' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK);
    return { status, database, backup };
  }

  private async backupState(): Promise<HealthReport['backup']> {
    const dir = this.env.BACKUP_DIR;
    if (!dir) return { configured: false, lastBackupAgeHours: null, stale: false };
    try {
      const files = (await readdir(dir)).filter((f) => f.startsWith('archiflow-') && f.endsWith('.dump.enc'));
      const times = await Promise.all(files.map(async (f) => (await stat(join(dir, f))).mtimeMs));
      if (times.length === 0) return { configured: true, lastBackupAgeHours: null, stale: true };
      const ageHours = (Date.now() - Math.max(...times)) / 3_600_000;
      return {
        configured: true,
        lastBackupAgeHours: Math.round(ageHours * 10) / 10,
        stale: ageHours > this.env.BACKUP_MAX_AGE_HOURS,
      };
    } catch {
      return { configured: true, lastBackupAgeHours: null, stale: true };
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
