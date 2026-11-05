import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../entities/message.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import {
  SearchFilterInterface,
  FilterResponseInterface,
} from 'src/utils/filter-response.interface';
import { IFilterQuery } from 'typeorm-dynamic-filters';

@Injectable()
export class MessageService extends ParameterBaseService<MessageEntity> {
  constructor(
    @InjectRepository(MessageEntity) repository: Repository<MessageEntity>,
    genericSearch: TypeOrmSelectService<MessageEntity>,
  ) {
    super(repository, genericSearch);
  }

  async findByFiltersUser(
    filter: IFilterQuery,
    chatId: string,
    userId: string,
    searchFilter?: SearchFilterInterface,
  ): Promise<FilterResponseInterface<MessageEntity>> {
    return this.findByFilters(filter, searchFilter, (builder) => {
      builder.where('alias.chatId = :chatId', { chatId });

      return builder;
    });
  }
}
