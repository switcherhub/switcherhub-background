import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssueEntity } from '../entities/issue.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class IssueService extends ParameterBaseService<IssueEntity> {
  constructor(
    @InjectRepository(IssueEntity) repository: Repository<IssueEntity>,
    genericSearch: TypeOrmSelectService<IssueEntity>,
  ) {
    super(repository, genericSearch);
  }

  async findByEntity(id: string) {
    return this.repository.findOne({
      where: {
        entityId: id,
      },
    });
  }
}
