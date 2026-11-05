import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerkEntity } from '../entities/perk.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class PerkService extends ParameterBaseService<PerkEntity> {
  constructor(
    @InjectRepository(PerkEntity) repository: Repository<PerkEntity>,
    genericSearch: TypeOrmSelectService<PerkEntity>,
  ) {
    super(repository, genericSearch);
  }
}
