import { Injectable, UnauthorizedException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity } from '../entities/report.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class ReportService extends ParameterBaseService<ReportEntity> {
  constructor(
    @InjectRepository(ReportEntity) repository: Repository<ReportEntity>,
    genericSearch: TypeOrmSelectService<ReportEntity>,
  ) {
    super(repository, genericSearch);
  }

  async findOne(userId: string, entityId: string) {
    return this.repository.findOne({
      where: {
        userId,
        issue: {
          entityId,
        },
      },
      relations: ['issue'],
    });
  }
}
