import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyTypeEntity } from '../entities/company-type.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class CompanyTypeService extends ParameterBaseService<CompanyTypeEntity> {
  constructor(
    @InjectRepository(CompanyTypeEntity) repository: Repository<CompanyTypeEntity>,
    genericSearch: TypeOrmSelectService<CompanyTypeEntity>,
  ) {
    super(repository, genericSearch);
  }
}
