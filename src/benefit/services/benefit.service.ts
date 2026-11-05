import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BenefitEntity } from '../entities/benefit.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class BenefitService extends ParameterBaseService<BenefitEntity> {
  constructor(
    @InjectRepository(BenefitEntity) repository: Repository<BenefitEntity>,
    genericSearch: TypeOrmSelectService<BenefitEntity>,
  ) {
    super(repository, genericSearch);
  }
}
