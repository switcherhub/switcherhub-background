import { UserSubscriptionService } from 'src/users/services/user-subscription.service';
import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserListEntity } from '../entities/user-list.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { UserListCreateDto } from '../dto/user-list-create.dto';
import { ListTypeEnum } from '../types/list-type.enum';
import { convertSalary } from 'src/salary/convertSalary';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { getEnumValues } from 'src/utils/getEnumValues';
import { CompanyService } from 'src/company/services/company.service';
import { ResumeService } from 'src/resume/services/resume.service';
import { VacancyService } from 'src/vacancy/services/vacancy.service';
import { ListEntityTypeEnum } from '../types/list-entity-type.enum';

@Injectable()
export class UserListService extends ParameterBaseService<UserListEntity> {
  constructor(
    @InjectRepository(UserListEntity) repository: Repository<UserListEntity>,
    genericSearch: TypeOrmSelectService<UserListEntity>,
    private readonly vacancyService: VacancyService,
    private readonly resumeService: ResumeService,
    private readonly companyService: CompanyService,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {
    super(repository, genericSearch);
  }

  async findShowedListByToday(userId: string): Promise<UserListEntity[]> {
    return this.repository
      .createQueryBuilder('alias')
      .where('alias.userId = :userId', { userId })
      .andWhere('alias.createdAt > :date', {
        date: new Date(new Date().setDate(new Date().getDate() - 1)),
      })
      .getMany();
  }

  getSalaryForPeriods(value: number) {
    return Object.fromEntries(
      getEnumValues(SalaryPeriodEnum).map((period) => [
        period,
        convertSalary(SalaryPeriodEnum.HOURLY, period, value),
      ]),
    );
  }

  async createByUser(list: UserListCreateDto) {
    const existed = await this.repository.findOne({
      where: {
        userId: list.userId,
        entityType: list.entityType,
        entityId: list.entityId,
        type: list.type,
      },
    });

    if (existed) {
      throw new BadRequestException('This item already exists in your list');
    }

    if (list.type == ListTypeEnum.SHOW_CONTACT) {
      const limitation = await this.userSubscriptionService.findUserLimitations(
        list.userId,
      );
      const showedList = await this.findShowedListByToday(list.userId);

      if (limitation.showContctactsDaily - showedList.length <= 0) {
        throw new BadRequestException(
          `You have reached the limit of ${limitation.showContctactsDaily} showed contacts for today`,
        );
      }
    }

    if (list.entityType == ListEntityTypeEnum.VACANCY) {
      const vacancy = await this.vacancyService.findOneOrFail(list.entityId);

      if (list.type == ListTypeEnum.SHOW_CONTACT) {
        this.vacancyService.incrementShowedContactsCount(
          vacancy.id,
          list.userId,
        );
      }

      if (vacancy.userId == list.userId) {
        throw new BadRequestException(
          'You cannot add your own vacancy to the list',
        );
      }
    }

    if (list.entityType == ListEntityTypeEnum.COMPANY) {
      const company = await this.companyService.findOneOrFail(list.entityId);

      if (company.userId == list.userId) {
        throw new BadRequestException(
          'You cannot add your own company to the list',
        );
      }
    }

    if (list.entityType == ListEntityTypeEnum.RESUME) {
      const resume = await this.resumeService.findOneOrFail(list.entityId);

      if (list.type == ListTypeEnum.SHOW_CONTACT) {
        this.resumeService.incrementShowedContactsCount(resume.id, list.userId);
      }

      if (resume.userId == list.userId) {
        throw new BadRequestException(
          'You cannot add your own resume to the list',
        );
      }
    }

    return this.create(list);
  }

  async deleteByUser(id: string, userId: string) {
    const userList = await this.findOneOrFail(id);

    if (userList.userId !== userId) {
      throw new Error('You are not authorized to delete this item');
    }

    return this.delete(id);
  }
}
