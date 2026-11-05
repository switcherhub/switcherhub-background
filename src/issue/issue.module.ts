import { TypeOrmModule } from '@nestjs/typeorm';

import { IssueEntity } from './entities/issue.entity';
import { Module } from '@nestjs/common';
import { IssueService } from './services/issue.service';
import { IssueController } from './controllers/issue.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([IssueEntity])],
  controllers: [IssueController],
  providers: [IssueService, TypeOrmSelectService],
  exports: [IssueService],
})
export class IssueModule {}
