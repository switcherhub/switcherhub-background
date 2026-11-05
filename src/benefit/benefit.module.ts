import { TypeOrmModule } from '@nestjs/typeorm';

import { BenefitEntity } from './entities/benefit.entity';
import { Module } from '@nestjs/common';
import { BenefitService } from './services/benefit.service';
import { BenefitController } from './controllers/benefit.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([BenefitEntity])],
  controllers: [BenefitController],
  providers: [BenefitService, TypeOrmSelectService],
  exports: [BenefitService],
})
export class BenefitModule {}
