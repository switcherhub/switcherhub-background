import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobTypeEntity } from '../entities/job-type.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { AppDataSource } from 'src/database/config';

@Injectable()
export class JobTypeService extends ParameterBaseService<JobTypeEntity> {
  constructor(
    @InjectRepository(JobTypeEntity) repository: Repository<JobTypeEntity>,
    genericSearch: TypeOrmSelectService<JobTypeEntity>,
  ) {
    super(repository, genericSearch);
  }

  async onModuleInit() {
    await AppDataSource.initialize();
  }
}
