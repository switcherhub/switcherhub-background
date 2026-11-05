import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenseRequiredEntity } from '../entities/license-required.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class LicenseRequiredService extends ParameterBaseService<LicenseRequiredEntity> {
  constructor(
    @InjectRepository(LicenseRequiredEntity) repository: Repository<LicenseRequiredEntity>,
    genericSearch: TypeOrmSelectService<LicenseRequiredEntity>,
  ) {
    super(repository, genericSearch);
  }
}

