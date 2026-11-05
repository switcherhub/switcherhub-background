import { TypeOrmModule } from '@nestjs/typeorm';

import { IndustryEntity } from './entities/industry.entity';
import { Module } from '@nestjs/common';
import { IndustryService } from './services/industry.service';
import { IndustryController } from './controllers/industry.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([IndustryEntity])],
  controllers: [IndustryController],
  providers: [IndustryService, TypeOrmSelectService],
  exports: [IndustryService],
})
export class IndustryModule {}
