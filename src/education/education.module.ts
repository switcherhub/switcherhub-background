import { TypeOrmModule } from '@nestjs/typeorm';

import { EducationEntity } from './entities/education.entity';
import { Module } from '@nestjs/common';
import { EducationService } from './services/education.service';
import { EducationController } from './controllers/education.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([EducationEntity])],
  controllers: [EducationController],
  providers: [EducationService, TypeOrmSelectService],
  exports: [EducationService],
})
export class EducationModule {}
