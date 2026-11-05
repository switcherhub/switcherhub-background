import { ReportUserController } from './controllers/report-user.controller';
import { ReportUserService } from './services/report-user.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportEntity } from './entities/report.entity';
import { Module } from '@nestjs/common';
import { ReportService } from './services/report.service';
import { ReportController } from './controllers/report.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { IssueModule } from 'src/issue/issue.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReportEntity]), IssueModule],
  controllers: [ReportUserController, ReportController],
  providers: [ReportUserService, ReportService, TypeOrmSelectService],
  exports: [ReportService],
})
export class ReportModule {}
