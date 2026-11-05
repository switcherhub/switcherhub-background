import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobCoreEntity } from '../entities/job-core.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class JobCoreService extends ParameterBaseService<JobCoreEntity> {
  constructor(
    @InjectRepository(JobCoreEntity) repository: Repository<JobCoreEntity>,
    genericSearch: TypeOrmSelectService<JobCoreEntity>,
  ) {
    super(repository, genericSearch);
  }
}
