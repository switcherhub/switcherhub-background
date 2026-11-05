import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyTypeEntity } from './entities/company-type.entity';
import { Module } from '@nestjs/common';
import { CompanyTypeService } from './services/company-type.service';
import { CompanyTypeController } from './controllers/company-type.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyTypeEntity])],
  controllers: [CompanyTypeController],
  providers: [CompanyTypeService, TypeOrmSelectService],
  exports: [CompanyTypeService],
})
export class CompanyTypeModule {}
