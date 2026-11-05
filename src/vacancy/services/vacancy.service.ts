import { ChatService } from 'src/chat/services/chat.service';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { VacancyEntity } from '../entities/vacancy.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { VacancyCreateDto } from '../dto/vacancy-create.dto';
import { convertSalary } from 'src/salary/convertSalary';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import {
  FilterResponseInterface,
  SearchFilterInterface,
} from 'src/utils/filter-response.interface';
import { IFilterQuery } from 'typeorm-dynamic-filters';
import { getEnumValues } from 'src/utils/getEnumValues';
import { DeleteResult } from 'src/utils/types/delete-result';
import { isUUID } from 'class-validator';
import { VacancyUpdateDto } from '../dto/vacancy-update.dto';
import { mapVacanciesToMapData } from '../map/mapSearchedVacancy';
import { UserListSelectService } from 'src/user-list/services/user-list-select.service';
import { ListTypeEnum } from 'src/user-list/types/list-type.enum';
import { ListEntityTypeEnum } from 'src/user-list/types/list-entity-type.enum';
import { mapToUserVacancyDto } from '../dto/user-vacancy.dto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class VacancyService extends ParameterBaseService<VacancyEntity> {
  constructor(
    @InjectRepository(VacancyEntity) repository: Repository<VacancyEntity>,
    genericSearch: TypeOrmSelectService<VacancyEntity>,
    private readonly userListSelectService: UserListSelectService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    super(repository, genericSearch);
  }

  async updateAllowChat(companyId: string, allowChat: boolean) {
    if (!isUUID(companyId)) {
      throw new BadRequestException(`companyId must be uuid`);
    }

    return this.repository.update(
      {
        companyId,
      },
      {
        allowChat,
      },
    );
  }

  // async onModuleInit() {
  //   console.log('VacancyService onModuleInit');

  //   const pageSize = 1000;
  //   let page = 0;
  //   let hasMoreData = true;

  //   while (hasMoreData) {
  //     console.log(`Loading page ${page + 1}...`);

  //     const vacancies = await this.findAll(pageSize, page * pageSize);
  //     console.log(`Loaded ${vacancies.length} vacancies`);

  //     for (const r of vacancies) {
  //       if (r.location?.city) r.locationCity = r.location.city;
  //       if (r.location?.zipCode) r.locationZipcode = r.location.zipCode;
  //       if (r.location?.lat) r.lat = r.location.lat;
  //       if (r.location?.lng) r.lng = r.location.lng;

  //       if (r.location?.lng && r.location?.lat) {
  //         r.locationPoint = {
  //           type: 'Point',
  //           coordinates: [r.location.lng, r.location.lat],
  //         };

  //         console.log('Updated locationPoint:', r.locationPoint);
  //       }

  //       await this.updateOne(r.id, r as any);
  //     }

  //     if (vacancies.length < pageSize) {
  //       hasMoreData = false;
  //     } else {
  //       page++;
  //     }
  //   }

  //   console.log('All vacancies updated.');
  // }

  async countByUser(userId: string): Promise<number> {
    const count = await this.repository.count({
      where: { user: { id: userId }, deletedAt: IsNull() },
    });

    return count;
  }

  async findAll(take?: number, skip?: number): Promise<VacancyEntity[]> {
    return this.repository.find({
      take,
      skip,
      where: {
        locationPoint: IsNull(),
      },
    });
  }

  async findHistoryByFilters(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
  ): Promise<FilterResponseInterface<VacancyEntity>> {
    filter.filterBy = [...filter.filterBy, 'deletedAt'];
    filter.filterType = [...filter.filterType, 'ge'];
    filter.filterValue = [...filter.filterValue, new Date().toDateString()];

    return this.findByFiltersAdmin(filter, {
      ...searchFilter,
      withDeleted: true,
    });
  }

  async findByFiltersAdmin(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
  ): Promise<FilterResponseInterface<VacancyEntity>> {
    const data = await this.findByFilters(
      this.convertFilterValuesBySalary(filter),
      {
        search: searchFilter.search,
        searchFields: searchFilter.searchFields,
        withDeleted: searchFilter.withDeleted,
        relations: ['company', 'company.logo'],
      },
    );

    return data;
  }

  async findUserVacancies(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
    userId: string,
    cacheKey?: string,
  ): Promise<FilterResponseInterface<VacancyEntity>> {
    return this.findByFiltersUser(
      filter,
      searchFilter,
      userId,
      undefined,
      undefined,
      undefined,
      false,
      true,
      true,
      cacheKey,
    );
  }

  async findByFiltersUser(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
    userId?: string,
    lat?: number,
    lng?: number,
    radius?: number,
    mapDataFormat = false,
    ignoreBlacklists = false,
    findMy: boolean = false,
    cacheKey?: string,
  ): Promise<FilterResponseInterface<VacancyEntity>> {
    // const cached = await this.cacheManager.get(cacheKey);
    // if (cached) {
    //   console.log('Cache hit for key:', cacheKey);
    //   return cached as any;
    // }

    const filterBy = [...filter.filterBy];

    const radiusInDegrees = (radius * 1000) / 111319.9;

    const select = mapDataFormat
      ? [
          'id',
          'lat',
          'lng',
          'isPremium',
          'locationCity',
          'locationZipcode',
          'locationArea',
          'industryId',
          'educationId',
          'workExpirienceId',
          'updatedAt',
          'createdAt',
          'minSalaryRange',
          'maxSalaryRange',
          'isApproved',
          'isHidden',
          'userId',
          'chatsStarted',
        ]
      : [
          'id',
          'title',
          'industryId',
          'location',
          'createdAt',
          'updatedAt',
          'minSalaryRange',
          'maxSalaryRange',
          'contactEmail',
          'contactPhone',
          'contactPerson',
          'isApproved',
          'isHidden',
          'isPremium',
          'locationCity',
          'locationZipcode',
          'locationArea',
          'educationId',
          'workExpirienceId',
          'views',
          'showedContacts',
          'userId',
          'chatsStarted',
          'salaryType',
          'salaryPeriod',
        ];

    const companySelect = mapDataFormat ? [] : ['id', 'name'];

    let blacklistedVacanciesIds: string[] = [];
    let blacklistedCompaniesIds: string[] = [];

    if (userId && !ignoreBlacklists) {
      // console.time('blacklist-query');
      const blacklisted = await this.userListSelectService.findIdsByType(
        ListTypeEnum.BLACKLIST,
        userId,
      );

      blacklistedVacanciesIds = blacklisted
        .filter((item) => item.entityType == ListEntityTypeEnum.VACANCY)
        .map((item) => item.entityId);

      blacklistedCompaniesIds = blacklisted
        .filter((item) => item.entityType == ListEntityTypeEnum.COMPANY)
        .map((item) => item.entityId);

      // console.timeEnd('blacklist-query');
    }

    // console.time('search-query');
    const data = await this.findByFilters(
      this.convertFilterValuesBySalary(filter),
      {
        search: searchFilter.search,
        searchFields: searchFilter.searchFields,
        withDeleted: searchFilter.withDeleted,
        relations: [],
        select,
      },
      (builder) => {
        if (blacklistedVacanciesIds.length > 0) {
          builder.andWhere('alias.id NOT IN (:...excludedIds)', {
            excludedIds: blacklistedVacanciesIds,
          });
        }

        if (blacklistedCompaniesIds.length > 0) {
          builder.andWhere('alias.companyId NOT IN (:...excludedIds)', {
            excludedIds: blacklistedCompaniesIds,
          });
        }

        if (userId) {
          if (findMy) {
            builder.andWhere('alias.userId = :userId', { userId });
          } else {
            builder.andWhere(
              new Brackets((qb) => {
                qb.where('alias.userId != :userId').orWhere(
                  'alias.userId IS NULL',
                );
              }),
              { userId },
            );
          }
        }

        builder
          .leftJoinAndSelect('alias.company', 'company')
          .select([
            ...select.map((v) => `alias.${v}`),
            ...companySelect.map((v) => `company.${v}`),
          ]);

        if (!mapDataFormat) {
          builder
            .leftJoinAndSelect('company.logo', 'logo')
            .addSelect(['logo.path']);
        }

        builder
          .leftJoinAndSelect('alias.jobTypes', 'jobTypes')
          .addSelect(['jobTypes.id', 'jobTypes.title']);

        if (!userId) {
          builder.andWhere('alias.isApproved = true');
          builder.andWhere('alias.isHidden = false');
          // builder.andWhere('company.isApproved = true');
          // builder.andWhere('company.isHidden = false');
        }

        if (filterBy.includes('perks.id')) {
          builder
            .leftJoinAndSelect('alias.perks', 'perks')
            .addSelect(['perks.id']);
        }

        if (filterBy.includes('benefits.id')) {
          builder
            .leftJoinAndSelect('alias.benefits', 'benefits')
            .addSelect(['benefits.id']);
        }

        if (!mapDataFormat) {
          builder.orderBy('alias.isPremium', 'DESC');
        }

        if (filter.orderBy === 'distance' && lat != null && lng != null) {
          builder
            .addSelect(
              `ST_DistanceSphere(alias.locationPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))`,
              'distance',
            )
            .orderBy('distance', filter.orderType)
            .setParameters({ lat, lng });
        }

        if (!lat || !lng || !radius) {
          return builder;
        }

        // const minLat = lat - radiusInDegrees;
        // const maxLat = lat + radiusInDegrees;
        // const minLng = lng - radiusInDegrees;
        // const maxLng = lng + radiusInDegrees;

        builder.andWhere(
          `ST_DWithin(alias.locationPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :radius)`,
          { lat, lng, radius: radiusInDegrees },
        );

        // builder.andWhere(
        //   `alias.locationPoint && ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)`,
        //   { minLat, maxLat, minLng, maxLng },
        // );

        return builder;
      },
    );

    // console.timeEnd('search-query');

    let result = null;

    if (mapDataFormat) {
      result = mapVacanciesToMapData(data, radiusInDegrees);
    } else {
      result = {
        ...data,
        data: data.data.map((item) => {
          return mapToUserVacancyDto(item) as any;
        }),
      };
    }

    // await this.cacheManager.set(cacheKey, result, 60 * 5 * 1000);

    return result;
  }

  async findOne(
    id: string,
    uniqueUserId?: string | undefined,
    userId?: string,
  ): Promise<VacancyEntity> {
    const vacancy = await this.findOneOrFail(
      id,
      userId,
      undefined,
      (builder) => {
        builder.leftJoinAndSelect(
          'vacancy.chats',
          'chats',
          'chats.ownerId = :userId AND chats.deletedAtOwner IS NULL',
          {
            userId,
          },
        );
      },
    );

    this.incrementViewCount(id, uniqueUserId);

    return vacancy;
  }

  async findOneOrFail(
    id: string,
    userId?: string,
    relations?: string[],
    callback?: (builder: SelectQueryBuilder<VacancyEntity>) => void,
  ): Promise<VacancyEntity> {
    if (!isUUID(id)) {
      throw new BadRequestException(`id must be uuid`);
    }

    const builder = this.repository
      .createQueryBuilder('vacancy')
      .leftJoinAndSelect('vacancy.jobTypes', 'jobTypes')
      .leftJoinAndSelect('vacancy.industry', 'industry')
      .leftJoinAndSelect('vacancy.user', 'user')
      .leftJoinAndSelect('vacancy.company', 'company')
      .leftJoinAndSelect('company.logo', 'logo')
      .leftJoinAndSelect('vacancy.perks', 'perks')
      .leftJoinAndSelect('vacancy.benefits', 'benefits')
      .where('vacancy.id = :id', { id });

    if (callback) {
      callback(builder);
    }

    const vacancy = await builder.getOne();

    if (!vacancy) {
      throw new NotFoundException(`Vacancy with id ${id} not found`);
    }

    if (userId) {
      const userList = await this.userListSelectService.findByEntityId(
        id,
        userId,
      );

      vacancy['isFavorite'] = userList.some(
        (item) => item.type == ListTypeEnum.FAVORITE,
      );

      vacancy['isBlacklist'] = userList.some(
        (item) => item.type == ListTypeEnum.BLACKLIST,
      );

      vacancy['isWatched'] = userList.some(
        (item) => item.type == ListTypeEnum.SHOW_CONTACT,
      );
    }

    return vacancy;
  }

  async create(resumeCreateDto: VacancyCreateDto): Promise<VacancyEntity> {
    const order = await this.repository
      .createQueryBuilder('entity')
      .select('MAX(entity.order)', 'max')
      .getRawOne();

    resumeCreateDto = this.convertSalaryIntoHourly(resumeCreateDto);

    const entity = this.repository.create({
      ...resumeCreateDto,
      order: order.max + 1,
    });

    const resume = await this.repository.save(entity);

    return this.findOneOrFail(resume.id);
  }

  async updateOne(id: string, data: VacancyUpdateDto): Promise<VacancyEntity> {
    const entity = await this.findOneOrFail(id);

    Object.assign(entity, this.convertSalaryIntoHourly(data));
    entity.id = id;
    console.log('Updating vacancy with data:', entity);
    await this.repository.save(entity);

    return this.findOneOrFail(id);
  }

  async deleteOne(id: string): Promise<DeleteResult> {
    const resume = await this.findOneOrFail(id);

    await this.repository.softRemove(resume);

    return {
      success: true,
      error: null,
    };
  }

  // Adds support for value conversion by passing SalaryPeriodEnum to HOURLY.
  // For example, exactSalary.YEARLY with a value of 1920 will be converted to 1.
  convertFilterValuesBySalary(filter: IFilterQuery): IFilterQuery {
    const allPeriods = getEnumValues(SalaryPeriodEnum);
    for (let index = 0; index < filter.filterBy.length; index++) {
      for (const period of allPeriods) {
        if (filter.filterBy[index].includes(`.${period}`)) {
          filter.filterBy[index] = filter.filterBy[index].replace(
            `.${period}`,
            '',
          );

          const values = filter.filterValue[index]
            .split('|')
            .map((num) =>
              convertSalary(period, SalaryPeriodEnum.HOURLY, Number(num)),
            );

          filter.filterValue[index] = values.join('|');
        }
      }
    }

    return filter;
  }

  convertSalaryIntoHourly<T extends VacancyCreateDto | VacancyUpdateDto>(
    data: T,
  ): T {
    if (data.minSalaryRange) {
      data.minSalaryRange = convertSalary(
        data.salaryPeriod,
        SalaryPeriodEnum.HOURLY,
        data.minSalaryRange,
      );
    }

    if (data.maxSalaryRange) {
      data.maxSalaryRange = convertSalary(
        data.salaryPeriod,
        SalaryPeriodEnum.HOURLY,
        data.maxSalaryRange,
      );
    }

    return data;
  }

  async incrementViewCount(
    id: string,
    uniqueUserId?: string | undefined,
  ): Promise<void> {
    try {
      if (!uniqueUserId) {
        return;
      }

      const cacheKey = `vacancy_view:${id}:${uniqueUserId}`;

      const alreadyViewed = await this.cacheManager.get(cacheKey);

      if (!alreadyViewed) {
        await this.repository.increment({ id }, 'views', 1);

        await this.cacheManager.set(cacheKey, true, 60 * 60 * 24);
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  async incrementShowedContactsCount(
    id: string,
    uniqueUserId?: string | undefined,
  ): Promise<void> {
    try {
      if (!uniqueUserId) {
        return;
      }

      const cacheKey = `vacancy_showed_contacts:${id}:${uniqueUserId}`;

      const alreadyViewed = await this.cacheManager.get(cacheKey);

      if (!alreadyViewed) {
        await this.repository.increment({ id }, 'showedContacts', 1);

        await this.cacheManager.set(cacheKey, true, 60 * 60 * 24);
      }
    } catch (error) {
      console.error('Error incrementing showed contacts count:', error);
    }
  }
}
