import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkEnvironmentEntity } from '../entities/work-environment.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class WorkEnvironmentService extends ParameterBaseService<WorkEnvironmentEntity> {
  constructor(
    @InjectRepository(WorkEnvironmentEntity)
    repository: Repository<WorkEnvironmentEntity>,
    genericSearch: TypeOrmSelectService<WorkEnvironmentEntity>,
  ) {
    super(repository, genericSearch);
  }
}
