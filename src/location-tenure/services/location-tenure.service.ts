import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationTenureEntity } from '../entities/location-tenure.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class LocationTenureService extends ParameterBaseService<LocationTenureEntity> {
  constructor(
    @InjectRepository(LocationTenureEntity)
    repository: Repository<LocationTenureEntity>,
    genericSearch: TypeOrmSelectService<LocationTenureEntity>,
  ) {
    super(repository, genericSearch);
  }
}
