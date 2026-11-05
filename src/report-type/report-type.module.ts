import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportTypeEntity } from './entities/report-type.entity';
import { Module } from '@nestjs/common';
import { ReportTypeService } from './services/report-type.service';
import { ReportTypeController } from './controllers/report-type.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReportTypeEntity])],
  controllers: [ReportTypeController],
  providers: [ReportTypeService, TypeOrmSelectService],
  exports: [ReportTypeService],
})
export class ReportTypeModule {}
