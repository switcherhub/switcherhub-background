import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { SubscriptionInterface } from '../types/subscription.interface';

@Injectable()
export class SubscriptionService extends ParameterBaseService<SubscriptionEntity> {
  constructor(
    @InjectRepository(SubscriptionEntity)
    repository: Repository<SubscriptionEntity>,
    genericSearch: TypeOrmSelectService<SubscriptionEntity>,
  ) {
    super(repository, genericSearch);
  }

  async findFreePlan(): Promise<SubscriptionInterface> {
    const freePlan = await this.repository.findOne({
      where: { isFree: true },
    });

    if (!freePlan) {
      throw new Error('Free plan not found');
    }

    return freePlan;
  }
}
