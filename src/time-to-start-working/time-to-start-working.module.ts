import { TypeOrmModule } from '@nestjs/typeorm';

import { TimeToStartWorkingEntity } from './entities/time-to-start-working.entity';
import { Module } from '@nestjs/common';
import { TimeToStartWorkingService } from './services/time-to-start-working.service';
import { TimeToStartWorkingController } from './controllers/time-to-start-working.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeToStartWorkingEntity])],
  controllers: [TimeToStartWorkingController],
  providers: [TimeToStartWorkingService, TypeOrmSelectService],
  exports: [TimeToStartWorkingService],
})
export class TimeToStartWorkingModule {}

