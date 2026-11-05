import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeNumberEntity } from '../entities/employee-number.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class EmployeeNumberService extends ParameterBaseService<EmployeeNumberEntity> {
  constructor(
    @InjectRepository(EmployeeNumberEntity) repository: Repository<EmployeeNumberEntity>,
    genericSearch: TypeOrmSelectService<EmployeeNumberEntity>,
  ) {
    super(repository, genericSearch);
  }
}
