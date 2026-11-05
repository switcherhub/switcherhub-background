import { TypeOrmModule } from '@nestjs/typeorm';

import { SameRoleCountEntity } from './entities/same-role-count.entity';
import { Module } from '@nestjs/common';
import { SameRoleCountService } from './services/same-role-count.service';
import { SameRoleCountController } from './controllers/same-role-count.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([SameRoleCountEntity])],
  controllers: [SameRoleCountController],
  providers: [SameRoleCountService, TypeOrmSelectService],
  exports: [SameRoleCountService],
})
export class SameRoleCountModule {}

