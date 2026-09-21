import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { ArchitectureController } from './architecture.controller';
import { ArchitectureService } from './architecture.service';
import { BomController } from './bom.controller';

@Module({
  imports: [ProjectsModule],
  controllers: [ArchitectureController, BomController],
  providers: [ArchitectureService],
})
export class ArchitectureModule {}
