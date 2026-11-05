import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkExpirianceEntity } from './entities/work-expiriance.entity';
import { Module } from '@nestjs/common';
import { WorkExpirianceService } from './services/work-expiriance.service';
import { WorkExpirianceController } from './controllers/work-expiriance.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkExpirianceEntity])],
  controllers: [WorkExpirianceController],
  providers: [WorkExpirianceService, TypeOrmSelectService],
  exports: [WorkExpirianceService],
})
export class WorkExpirianceModule {}
