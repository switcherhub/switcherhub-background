import { TypeOrmModule } from '@nestjs/typeorm';

import { JobCoreEntity } from './entities/job-core.entity';
import { Module } from '@nestjs/common';
import { JobCoreService } from './services/job-core.service';
import { JobCoreController } from './controllers/job-core.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobCoreEntity])],
  controllers: [JobCoreController],
  providers: [JobCoreService, TypeOrmSelectService],
  exports: [JobCoreService],
})
export class JobCoreModule {}
