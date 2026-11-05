import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParserEntity } from '../entities/parser.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Injectable()
export class ParserService extends ParameterBaseService<ParserEntity> {
  constructor(
    @InjectRepository(ParserEntity) repository: Repository<ParserEntity>,
    genericSearch: TypeOrmSelectService<ParserEntity>,
  ) {
    super(repository, genericSearch);
  }

  async findByBrandOrFail(brand: string): Promise<ParserEntity> {
    const parser = await this.repository.findOne({
      where: { brand },
    });

    if (!parser) {
      throw new Error(`Parser not found for brand: ${brand}`);
    }

    return parser;
  }
}
