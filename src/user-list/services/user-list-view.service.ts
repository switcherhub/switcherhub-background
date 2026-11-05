import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserListEntity } from '../entities/user-list.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { IFilterQuery } from 'typeorm-dynamic-filters';
import { convertSalary } from 'src/salary/convertSalary';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { getEnumValues } from 'src/utils/getEnumValues';
import { UserListViewEntity } from '../entities/user-list.view.entity';

@Injectable()
export class UserListViewService extends ParameterBaseService<UserListViewEntity> {
  constructor(
    @InjectRepository(UserListViewEntity)
    repository: Repository<UserListViewEntity>,
    genericSearch: TypeOrmSelectService<UserListViewEntity>,
  ) {
    super(repository, genericSearch);
  }

  async findByFiltersUser(filter: IFilterQuery, userId: string) {
    const res = await this.findByFilters(
      filter,
      {
        select: [
          'id',
          'type',
          'entityType',
          'entityId',
          'userId',
          'title',
          'firstName',
          'lastName',
          'name',
          'jobTypes',
          'industryId',
          'createdAt',
          'contactPerson',
          'contactEmail',
          'contactPhone',
          'isPremium',
          'company',
          'location',
          'userListCreatedAt',
          'salaryHourly',
          'hoursPerMonth',
        ],
      },
      (builder) => {
        builder.andWhere('alias.userId = :userId', { userId });

        builder.orderBy('alias.userListCreatedAt', 'DESC');

        return builder;
      },
    );

    return {
      ...res,
      data: res.data
    };
  }

  getSalaryForPeriods(value: number) {
    return Object.fromEntries(
      getEnumValues(SalaryPeriodEnum).map((period) => [
        period,
        convertSalary(SalaryPeriodEnum.HOURLY, period, value),
      ]),
    );
  }
}
