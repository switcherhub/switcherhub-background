import { TypeOrmModule } from '@nestjs/typeorm';

import { JobTypeEntity } from './entities/job-type.entity';
import { Module } from '@nestjs/common';
import { JobTypeService } from './services/job-type.service';
import { JobTypeController } from './controllers/job-type.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobTypeEntity])],
  controllers: [JobTypeController],
  providers: [JobTypeService, TypeOrmSelectService],
  exports: [JobTypeService],
})
export class JobTypeModule {}
