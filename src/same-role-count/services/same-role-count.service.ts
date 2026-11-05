import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SameRoleCountEntity } from '../entities/same-role-count.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class SameRoleCountService extends ParameterBaseService<SameRoleCountEntity> {
  constructor(
    @InjectRepository(SameRoleCountEntity) repository: Repository<SameRoleCountEntity>,
    genericSearch: TypeOrmSelectService<SameRoleCountEntity>,
  ) {
    super(repository, genericSearch);
  }
}

