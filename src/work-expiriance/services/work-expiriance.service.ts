import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkExpirianceEntity } from '../entities/work-expiriance.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class WorkExpirianceService extends ParameterBaseService<WorkExpirianceEntity> {
  constructor(
    @InjectRepository(WorkExpirianceEntity) repository: Repository<WorkExpirianceEntity>,
    genericSearch: TypeOrmSelectService<WorkExpirianceEntity>,
  ) {
    super(repository, genericSearch);
  }
}
