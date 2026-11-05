import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeToStartWorkingEntity } from '../entities/time-to-start-working.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class TimeToStartWorkingService extends ParameterBaseService<TimeToStartWorkingEntity> {
  constructor(
    @InjectRepository(TimeToStartWorkingEntity) repository: Repository<TimeToStartWorkingEntity>,
    genericSearch: TypeOrmSelectService<TimeToStartWorkingEntity>,
  ) {
    super(repository, genericSearch);
  }
}

