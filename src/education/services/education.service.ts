import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EducationEntity } from '../entities/education.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class EducationService extends ParameterBaseService<EducationEntity> {
  constructor(
    @InjectRepository(EducationEntity) repository: Repository<EducationEntity>,
    genericSearch: TypeOrmSelectService<EducationEntity>,
  ) {
    super(repository, genericSearch);
  }
}
