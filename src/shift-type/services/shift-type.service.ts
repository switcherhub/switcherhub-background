import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftTypeEntity } from '../entities/shift-type.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class ShiftTypeService extends ParameterBaseService<ShiftTypeEntity> {
  constructor(
    @InjectRepository(ShiftTypeEntity) repository: Repository<ShiftTypeEntity>,
    genericSearch: TypeOrmSelectService<ShiftTypeEntity>,
  ) {
    super(repository, genericSearch);
  }
}
