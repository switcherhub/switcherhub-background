import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTypeEntity } from '../entities/report-type.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class ReportTypeService extends ParameterBaseService<ReportTypeEntity> {
  constructor(
    @InjectRepository(ReportTypeEntity) repository: Repository<ReportTypeEntity>,
    genericSearch: TypeOrmSelectService<ReportTypeEntity>,
  ) {
    super(repository, genericSearch);
  }
}
