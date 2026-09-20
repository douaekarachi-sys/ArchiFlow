import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigModule } from './core/config/config.module';
import { ENV, type Env } from './core/config/env';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArchitectureModule } from './modules/architecture/architecture.module';
import { ClientCompaniesModule } from './modules/client-companies/client-companies.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.controller';
import { MailModule } from './modules/mail/mail.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthGuard } from './security/guards/jwt-auth.guard';
import { PermissionsGuard } from './security/guards/permissions.guard';
import { SecurityModule } from './security/security.module';
import { WorkersModule } from './workers/retention.worker';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SecurityModule,
    AuditModule,
    MailModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ name: 'auth', ttl: env.THROTTLE_AUTH_TTL_MS, limit: env.THROTTLE_AUTH_LIMIT }],
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ClientCompaniesModule,
    CatalogModule,
    ProjectsModule,
    ArchitectureModule,
    HealthModule,
    WorkersModule,
  ],
  providers: [
    // Ordre significatif : authentification, puis permissions.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
