import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audited';
import { AuditService } from './audit.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
