import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkEnvironmentEntity } from './entities/work-environment.entity';
import { Module } from '@nestjs/common';
import { WorkEnvironmentService } from './services/work-environment.service';
import { WorkEnvironmentController } from './controllers/work-environment.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkEnvironmentEntity])],
  controllers: [WorkEnvironmentController],
  providers: [WorkEnvironmentService, TypeOrmSelectService],
  exports: [WorkEnvironmentService],
})
export class WorkEnvironmentModule {}
