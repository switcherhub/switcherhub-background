import { ResumeKey } from 'src/resume/types/resume.interface';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VacancyEntity } from '../entities/vacancy.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { VacancyCreateDto } from '../dto/vacancy-create.dto';
import { UserService } from 'src/users/services/user.service';
import { DeleteResult } from 'src/utils/types/delete-result';
import { VacancyService } from './vacancy.service';
import { VacancyUpdateDto } from '../dto/vacancy-update.dto';
import { CompanyService } from 'src/company/services/company.service';
import {
  listVacancyRelations,
  USER_VACANCY_LISTS,
  UserVacancyList,
} from 'src/users/interfaces/user-vacancy-list.type';
import { mapUserVacancyList } from '../map/mapSearchedVacancy';
import { UserSubscriptionService } from 'src/users/services/user-subscription.service';

@Injectable()
export class VacancyUserService extends ParameterBaseService<VacancyEntity> {
  constructor(
    @InjectRepository(VacancyEntity) repository: Repository<VacancyEntity>,
    genericSearch: TypeOrmSelectService<VacancyEntity>,
    private readonly userService: UserService,
    private readonly vacancyService: VacancyService,
    private readonly companyService: CompanyService,
    private readonly userSubscritionService: UserSubscriptionService,
  ) {
    super(repository, genericSearch);
  }

  async onModuleInit() {
    // this.checkAvailableCount('342e8499-d2ca-4aa0-a1d3-bd0c1056b719');
  }

  fieldsForApprove: ResumeKey[] = ['title'];

  async setPremium(
    id: string,
    userId: string,
    isPremium: boolean,
  ): Promise<VacancyEntity> {
    const user = await this.userService.findOneOrFail(userId);

    if (isPremium) {
      const limimtations =
        await this.userSubscritionService.findUserLimitations(userId);

      const premiumVacancyCount = await this.findPremimumVacanciesCount(userId);

      if (premiumVacancyCount >= limimtations.upgradeCount) {
        throw new ForbiddenException(
          `You have reached the maximum number of premium vacancies allowed (${limimtations.upgradeCount}). Please delete an existing premium vacancy to create a new one.`,
        );
      }
    }

    const vacancy = await this.vacancyService.findOneOrFail(id, userId);

    vacancy.isPremium = isPremium;

    return this.vacancyService.save(id, {
      id: vacancy.id,
      isPremium: isPremium,
    });
  }

  async setVisibility(
    id: string,
    userId: string,
    isHidden: boolean,
  ): Promise<VacancyEntity> {
    const user = await this.userService.findOneOrFail(userId, ['subscription']);
    const isSubscribed = user.subscription && !user.subscription.isFree;

    if (isHidden === false) {
      const limimtations =
        await this.userSubscritionService.findUserLimitations(userId);

      const visibleVacancyCount = await this.findVisibleVacanciesCount(userId);

      if (visibleVacancyCount >= limimtations.vacanciesCount) {
        throw new ForbiddenException(
          `You have reached the maximum number of visible vacancies allowed (${limimtations.vacanciesCount})`,
        );
      }
    }

    const vacancy = await this.vacancyService.findOneOrFail(id, userId);

    if (vacancy.userId !== userId) {
      throw new ForbiddenException('You do not have access to this vacancy');
    }

    vacancy.isHidden = isHidden;
    vacancy.isPremium = isSubscribed ? !isHidden : false;

    return this.vacancyService.save(id, vacancy);
  }

  async findPremimumVacanciesCount(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        isPremium: true,
      },
    });
  }

  async findVisibleVacanciesCount(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        isHidden: false,
        isApproved: true,
      },
    });
  }

  async updateByUser(
    id: string,
    data: VacancyUpdateDto,
    userId: string,
  ): Promise<VacancyEntity> {
    await this.userService.findOneOrFail(userId);
    await this.vacancyService.findOneOrFail(id, userId);

    // for (const key in data) {
    //   if (this.fieldsForApprove.includes(key as ResumeKey)) {
    //     data.isApproved = false;
    //     break;
    //   }
    // }

    return this.vacancyService.updateOne(id, data);
  }

  async createByUser(
    vacancyCreateDto: VacancyCreateDto,
    userId: string,
  ): Promise<VacancyEntity> {
    const user = await this.userService.findOneOrFail(userId, ['subscription']);
    const company = await this.companyService.findOneOrFail(
      vacancyCreateDto.companyId,
    );

    if (company.userId !== userId) {
      throw new ForbiddenException('You do not have access to this company');
    }

    const limitations =
      await this.userSubscritionService.findUserLimitations(userId);
    const userVacancyCount = await this.vacancyService.countByUser(userId);

    if (userVacancyCount >= limitations.vacanciesCount) {
      throw new ForbiddenException(
        `You have reached the maximum number of vacancies allowed (${limitations.vacanciesCount}). Please delete an existing resume to create a new one.`,
      );
    }

    vacancyCreateDto.user = user;
    vacancyCreateDto.isHidden = false;

    return this.vacancyService.create(vacancyCreateDto);
  }

  async deleteByUser(
    id: string,
    userId: string,
    noteDeletion: string,
  ): Promise<DeleteResult> {
    await this.userService.findOneOrFail(userId);

    await this.vacancyService.save(id, {
      noteDeletion,
    });

    return this.vacancyService.deleteOne(id);
  }

  async findUserList(userId: string, relation: UserVacancyList) {
    const user = await this.userService.findOneOrFail(userId, [
      ...USER_VACANCY_LISTS,
      ...listVacancyRelations(relation),
    ]);

    return mapUserVacancyList(user[relation], user);
  }

  async addToUserList(id: string, userId: string, relation: UserVacancyList) {
    const resume = await this.findOneOrFail(id);
    const user = await this.userService.findOneOrFail(userId, [relation]);

    if (!user[relation].includes(resume)) {
      user[relation].push(resume);
      await this.userService.update(user);
    }

    return this.findUserList(userId, relation);
  }

  async deleteFromUserList(
    id: string,
    userId: string,
    relation: UserVacancyList,
  ) {
    const user = await this.userService.findOneOrFail(userId, [relation]);

    user[relation] = user[relation].filter((f) => f.id !== id);

    await this.userService.update(user);

    return this.findUserList(userId, relation);
  }

  async checkAvailableCount(userId: string): Promise<boolean> {
    const limitations =
      await this.userSubscritionService.findUserLimitations(userId);
    const user = await this.userService.findOneOrFail(userId, [
      'vacancies',
      'subscription',
    ]);
    const isSubscribed = !!(user.subscription && !user.subscription.isFree);

    const approved = user.vacancies
      .filter((v) => v.isApproved)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const allowedVisible = approved
      .filter((v) => v.isApproved && !v.isHidden)
      .slice(0, limitations.vacanciesCount);
    const allowedIds = new Set(allowedVisible.map((v) => v.id));
    console.log('Allowed IDs:', allowedIds);

    const toUpdate = [];

    for (const vacancy of user.vacancies) {
      if (allowedIds.has(vacancy.id)) {
        console.log('Allow:', vacancy.id);
        vacancy.isHidden = false;
        vacancy.isPremium = isSubscribed;
      } else {
        console.log('Hide:', vacancy.id);
        vacancy.isHidden = true;
        vacancy.isPremium = false;
      }

      toUpdate.push(vacancy);
    }

    console.log('Subscription:', limitations.vacanciesCount, isSubscribed);
    console.log(
      toUpdate.map((v) => ({
        isPremium: v.isPremium,
        isHidden: v.isHidden,
      })),
    );

    await this.repository.save(toUpdate);

    return true;
  }
}
