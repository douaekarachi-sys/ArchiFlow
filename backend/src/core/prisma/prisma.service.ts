import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV, type Env } from '../config/env';
import { PrismaClient } from '../../generated/prisma/client';
import { assertOrgScoped } from './org-scope';

function withOrgScope(client: PrismaClient) {
  return client.$extends({
    name: 'org-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          assertOrgScoped(model, operation, args as Record<string, unknown> | undefined);
          return query(args);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof withOrgScope>;

/**
 * Deux accès à la base, volontairement distincts :
 *
 * - `tenant` : pour tout le code métier. Le filet d'isolation y est actif.
 * - `system` : réservé aux flux qui précèdent la connaissance du locataire (connexion,
 *   rafraîchissement de session), au journal d'audit, aux tâches de rétention et au seed.
 *   Son usage se lit à la revue de code : il est rare et doit le rester.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly system: PrismaClient;
  readonly tenant: TenantClient;

  constructor(@Inject(ENV) env: Env) {
    this.system = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
    this.tenant = withOrgScope(this.system);
  }

  async onModuleDestroy(): Promise<void> {
    await this.system.$disconnect();
  }
}
