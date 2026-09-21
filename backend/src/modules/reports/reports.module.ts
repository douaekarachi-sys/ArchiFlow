import { Module } from '@nestjs/common';
import { ArchitectureModule } from '../architecture/architecture.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ProjectsModule, ArchitectureModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
