import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndustryEntity } from '../entities/industry.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class IndustryService extends ParameterBaseService<IndustryEntity> {
  constructor(
    @InjectRepository(IndustryEntity) repository: Repository<IndustryEntity>,
    genericSearch: TypeOrmSelectService<IndustryEntity>,
  ) {
    super(repository, genericSearch);
  }
}
