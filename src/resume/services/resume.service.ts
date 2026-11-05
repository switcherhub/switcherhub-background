import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { ResumeEntity } from '../entities/resume.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { ResumeCreateDto } from '../dto/resume-create.dto';
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
import { ResumeUpdateDto } from '../dto/resume-update.dto';
import { mapSearchedResume } from '../maps/mapSearchedResume';
import { mapSwitchersResume } from '../maps/mapSwitchersResume';
import { ListTypeEnum } from 'src/user-list/types/list-type.enum';
import { UserListSelectService } from 'src/user-list/services/user-list-select.service';
import { ListEntityTypeEnum } from 'src/user-list/types/list-entity-type.enum';
import { mapToUserResumeDto } from '../dto/user-resume.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { UserEntity } from 'src/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  Coordinate,
  RoutingMatrixService,
} from 'src/routing-matrix/services/routing-matrix.service';

@Injectable()
export class ResumeService extends ParameterBaseService<ResumeEntity> {
  constructor(
    @InjectRepository(ResumeEntity) repository: Repository<ResumeEntity>,
    genericSearch: TypeOrmSelectService<ResumeEntity>,
    private readonly userListSelectService: UserListSelectService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly routingMatrixService: RoutingMatrixService,
  ) {
    super(repository, genericSearch);
  }

  // async onModuleInit() {
  //   const resumes = await this.findAll();

  //   for (const r of resumes) {
  //     if (r.location?.city) r.locationCity = r.location.city;

  //     if (r.location?.zipCode) r.locationZipcode = r.location.zipCode;

  //     if (r.location?.lat) r.lat = r.location.lat;

  //     if (r.location?.lng) r.lng = r.location.lng;

  //     this.updateOne(r.id, r as any);
  //   }
  // }

  async findHistoryByFilters(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
  ): Promise<FilterResponseInterface<ResumeEntity>> {
    filter.filterBy = [...filter.filterBy, 'deletedAt'];
    filter.filterType = [...filter.filterType, 'ge'];
    filter.filterValue = [...filter.filterValue, new Date().toDateString()];

    return this.findByFiltersOverwrite(filter, {
      ...searchFilter,
      withDeleted: true,
    });
  }

  async countByUser(
    userId: string,
  ): Promise<number> {
    const count = await this.repository.count({
      where: {
        userId,
        deletedAt: IsNull(),
        isActive: true,
      },
    });

    return count;
  }

  async findByFiltersOverwrite(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
    user?: UserEntity,
    lat?: number,
    lng?: number,
    radius?: number,
    hlng?: number,
    hlat?: number,
    ignoreBlacklists?: boolean,
    findMy?: boolean,
  ): Promise<FilterResponseInterface<ResumeEntity>> {
    let blacklistedResumesIds: string[] = [];

    if (user && !ignoreBlacklists) {
      // console.time('blacklist-query');
      const blacklisted = await this.userListSelectService.findIdsByType(
        ListTypeEnum.BLACKLIST,
        user.id,
      );

      blacklistedResumesIds = blacklisted
        .filter((item) => item.entityType == ListEntityTypeEnum.RESUME)
        .map((item) => item.entityId);

      // console.timeEnd('blacklist-query');
    }

    const res = await this.findByFilters(
      this.convertFilterValuesBySalary(filter),
      {
        search: searchFilter.search,
        searchFields: searchFilter.searchFields,
        withDeleted: searchFilter.withDeleted,
        relations: ['user'],
      },
      (builder) => {
        // Додаємо всі зв'язки для резюме
        builder
          .leftJoinAndSelect('alias.jobCore', 'jobCore')
          .leftJoinAndSelect('alias.workEnvironment', 'workEnvironment')
          .leftJoinAndSelect('alias.shiftType', 'shiftType')
          .leftJoinAndSelect('alias.locationTenure', 'locationTenure')
          .leftJoinAndSelect('alias.sameRoleCount', 'sameRoleCount')
          .leftJoinAndSelect('alias.timeToStartWorking', 'timeToStartWorking')
          .leftJoinAndSelect('alias.licenseRequired', 'licenseRequired');

        if (user) {
          if (findMy) {
            builder.andWhere('alias.userId = :userId', { userId: user.id });
          } else {
            builder.andWhere(
              new Brackets((qb) => {
                qb.where('alias.userId IS NULL').orWhere(
                  'alias.userId != :userId',
                );
              }),
              { userId: user.id },
            );
            builder.andWhere('alias.isActive = true');
          }
        }

        if (blacklistedResumesIds.length > 0) {
          builder.andWhere(
            new Brackets((qb) => {
              qb.where('alias.id IS NULL').orWhere(
                'alias.id NOT IN (:...excludedResumeIds)',
              );
            }),
            { excludedResumeIds: blacklistedResumesIds },
          );
        }

        if (!user) {
          builder.andWhere('alias.isHidden = false');
          builder.andWhere('alias.isApproved = true');
          builder.andWhere('alias.isActive = true');
        }

        if (!lat || !lng || !radius || !hlng || !hlat) {
          return builder;
        }

        const distanceFormula =
          '6371 * ACOS(COS(RADIANS(:lat)) * COS(RADIANS(alias.lat)) * COS(RADIANS(alias.lng) - RADIANS(:lng)) + SIN(RADIANS(:lat)) * SIN(RADIANS(alias.lat)))';

        builder
          .addSelect(distanceFormula, 'distance')
          .setParameters({ lat: hlat, lng: hlng, radius })
          .andWhere(`${distanceFormula} <= :radius`);

        if (filter.orderBy == 'distance') {
          builder.addOrderBy(`${filter.orderBy}`, filter.orderType);
        }

        return builder;
      },
    );

    return {
      ...res,
      data: mapSwitchersResume(
        mapSearchedResume(res.data, user?.id),
        lat,
        lng,
        hlat,
        hlng,
        radius,
      ).map((item) => {
        return mapToUserResumeDto(item) as any;
      }),
    };
  }

  async findOne(
    id: string,
    uniqueUserId?: string | undefined,
    userId?: string,
  ): Promise<ResumeEntity> {
    const resume = await this.findOneOrFail(
      id,
      userId,
      undefined,
      (builder) => {
        // Додаємо всі ManyToOne зв'язки
        builder
          .leftJoinAndSelect('resume.jobCore', 'jobCore')
          .leftJoinAndSelect('resume.workEnvironment', 'workEnvironment')
          .leftJoinAndSelect('resume.shiftType', 'shiftType')
          .leftJoinAndSelect('resume.locationTenure', 'locationTenure')
          .leftJoinAndSelect('resume.sameRoleCount', 'sameRoleCount')
          .leftJoinAndSelect('resume.timeToStartWorking', 'timeToStartWorking')
          .leftJoinAndSelect('resume.licenseRequired', 'licenseRequired');
      },
    );

    if (
      resume.isActive === false &&
      (!userId || resume.userId !== userId)
    ) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    this.incrementViewCount(id, uniqueUserId);

    return resume;
  }

  async findOneOrFail(
    id: string,
    userId?: string,
    relations?: string[],
    callback?: (builder: SelectQueryBuilder<ResumeEntity>) => void,
  ): Promise<ResumeEntity> {
    if (!isUUID(id)) {
      throw new BadRequestException(`id must be uuid`);
    }

    const builder = this.repository
      .createQueryBuilder('resume')
      .leftJoinAndSelect('resume.user', 'user')
      .where('resume.id = :id', { id });

    if (callback) {
      callback(builder);
    }

    const resume = await builder.getOne();

    if (!resume) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    // if (userId && (!resume.user || resume.user.id !== userId)) {
    //   throw new ForbiddenException(`Forbidden`);
    // }

    if (userId) {
      const userList = await this.userListSelectService.findByEntityId(
        id,
        userId,
      );

      // if (resume.userId !== userId) {
      //   throw new ForbiddenException(
      //     `You don't have permission to access this resume`,
      //   );
      // }

      resume['isFavorite'] = userList.some(
        (item) => item.type == ListTypeEnum.FAVORITE,
      );

      resume['isBlacklist'] = userList.some(
        (item) => item.type == ListTypeEnum.BLACKLIST,
      );

      resume['isWatched'] = userList.some(
        (item) => item.type == ListTypeEnum.SHOW_CONTACT,
      );
    }

    return resume;
  }

  async create(resumeCreateDto: ResumeCreateDto): Promise<ResumeEntity> {
    const order = await this.repository
      .createQueryBuilder('entity')
      .select('MAX(entity.order)', 'max')
      .getRawOne();


    const entity = this.repository.create({
      ...resumeCreateDto,
      order: order.max + 1,
    });

    // Calculate commute distance and duration if both locations are provided
    console.log(
      '[Resume Service] Checking locations for commute calculation:',
      {
        hasLocationHome: !!entity.locationHome,
        hasLocation: !!entity.location,
        locationHome: entity.locationHome
          ? {
              lat: entity.locationHome.lat,
              lng: entity.locationHome.lng,
            }
          : null,
        location: entity.location
          ? {
              lat: entity.location.lat,
              lng: entity.location.lng,
            }
          : null,
      },
    );

    await this.applyCommuteToEntity(entity);

    const resume = await this.repository.save(entity);

    return this.findOneOrFail(resume.id);
  }

  async updateOne(id: string, data: ResumeUpdateDto): Promise<ResumeEntity> {
    const entity = await this.findOneOrFail(id);

    this.repository.merge(entity, data);

    const locationHomeChanged =
      data.locationHome !== undefined &&
      JSON.stringify(data.locationHome) !== JSON.stringify(entity.locationHome);
    const locationChanged =
      data.location !== undefined &&
      JSON.stringify(data.location) !== JSON.stringify(entity.location);

    if (locationHomeChanged || locationChanged) {
      await this.applyCommuteToEntity(entity);
    }

    await this.repository.save(entity);

    return this.findOneOrFail(id);
  }

  /**
   * Recalculates commute distance and duration for a resume by id (uses current locationHome and location).
   * Saves the entity and returns the updated resume.
   */
  async recalculateCommute(id: string): Promise<ResumeEntity> {
    const entity = await this.findOneOrFail(id);
    await this.applyCommuteToEntity(entity);
    await this.repository.save(entity);
    return this.findOneOrFail(id);
  }

  /**
   * Sets entity.commuteDistanceKm and entity.commuteDurationSeconds from locationHome → location (or null if missing/failed).
   */
  private async applyCommuteToEntity(entity: ResumeEntity): Promise<void> {
    const locationHome = entity.locationHome;
    const location = entity.location;

    if (locationHome && location) {
      const commuteData = await this.calculateCommute(locationHome, location);
      if (commuteData) {
        entity.commuteDistanceKm = commuteData.distanceKm;
        entity.commuteDurationSeconds = commuteData.durationSeconds;
      } else {
        entity.commuteDistanceKm = null;
        entity.commuteDurationSeconds = null;
      }
    } else {
      entity.commuteDistanceKm = null;
      entity.commuteDurationSeconds = null;
    }
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

  async incrementViewCount(
    id: string,
    uniqueUserId?: string | undefined,
  ): Promise<void> {
    try {
      if (!uniqueUserId) {
        return;
      }

      const cacheKey = `resume_view:${id}:${uniqueUserId}`;

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

      const cacheKey = `resume_showed_contacts:${id}:${uniqueUserId}`;

      const alreadyViewed = await this.cacheManager.get(cacheKey);

      if (!alreadyViewed) {
        await this.repository.increment({ id }, 'showedContacts', 1);

        await this.cacheManager.set(cacheKey, true, 60 * 60 * 24);
      }
    } catch (error) {
      console.error('Error incrementing showed contacts count:', error);
    }
  }

  /**
   * Calculate commute distance and duration from locationHome to location using OSRM API
   */
  private async calculateCommute(
    locationHome: any,
    location: any,
  ): Promise<{ distanceKm: number; durationSeconds: number } | null> {
    console.log('[Resume Service] calculateCommute called with:', {
      locationHome: locationHome
        ? { lat: locationHome.lat, lng: locationHome.lng }
        : null,
      location: location ? { lat: location.lat, lng: location.lng } : null,
    });

    if (
      !locationHome?.lng ||
      !locationHome?.lat ||
      !location?.lng ||
      !location?.lat
    ) {
      console.log('[Resume Service] calculateCommute: Missing coordinates');
      return null;
    }

    try {
      const coordinates: Coordinate[] = [
        { lng: locationHome.lng, lat: locationHome.lat },
        { lng: location.lng, lat: location.lat },
      ];
      const providerName =
        this.routingMatrixService.getActiveProvider().getProviderName();
      console.log(
        `[Resume Service] Calculating commute via routing provider "${providerName}": ${locationHome.lng},${locationHome.lat} -> ${location.lng},${location.lat}`,
      );
      const response = await this.routingMatrixService.calculateMatrix(
        {
          sources: [0],
          destinations: [1],
          coordinates,
        },
        'ResumeService.calculateCommute',
      );

      const distance = response.distances?.[0]?.[0];
      const duration = response.durations?.[0]?.[0];

      if (distance !== undefined && duration !== undefined) {
        const result = {
          distanceKm: distance / 1000, // Convert from meters to kilometers
          durationSeconds: duration, // Already in seconds
        };
        console.log(
          `[Resume Service] Commute calculated: ${result.distanceKm.toFixed(2)}km, ${Math.round(result.durationSeconds / 60)}min`,
        );
        return result;
      }

      return null;
    } catch (error) {
      console.error(
        `[Resume Service] Error calculating commute via routing matrix from ${locationHome.lng},${locationHome.lat} to ${location.lng},${location.lat}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
}
