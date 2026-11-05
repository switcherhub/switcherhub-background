import { Brackets, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { SearchResumeVacancyView } from '../entities/search.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { mapSearchedResume } from 'src/resume/maps/mapSearchedResume';
import {
  mapSearchView,
  mapSwitchersResume,
} from 'src/resume/maps/mapSwitchersResume';
import {
  SearchFilterInterface,
  FilterResponseInterface,
} from 'src/utils/filter-response.interface';
import { IFilterQuery } from 'typeorm-dynamic-filters';
import { convertSalary } from 'src/salary/convertSalary';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { getEnumValues } from 'src/utils/getEnumValues';
import { mapVacanciesToMapData } from 'src/vacancy/map/mapSearchedVacancy';
import { ListEntityTypeEnum } from 'src/user-list/types/list-entity-type.enum';
import { ListTypeEnum } from 'src/user-list/types/list-type.enum';
import { UserListSelectService } from 'src/user-list/services/user-list-select.service';

@Injectable()
export class SearchViewService extends ParameterBaseService<SearchResumeVacancyView> {
  constructor(
    @InjectRepository(SearchResumeVacancyView)
    private readonly searchRepository: Repository<SearchResumeVacancyView>,
    genericSearch: TypeOrmSelectService<SearchResumeVacancyView>,
    private readonly userListSelectService: UserListSelectService,
  ) {
    super(searchRepository, genericSearch);
  }

  async findByFiltersOverwrite(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
    userId?: string,
    lat?: number,
    lng?: number,
    radius?: number,
    hlng?: number,
    hlat?: number,
    type?: 'all' | 'vacancy' | 'switcher',
    mapDataFormat?: boolean,
  ): Promise<FilterResponseInterface<ResumeEntity>> {
    const select = mapDataFormat
      ? [
          'id',
          'lat',
          'lng',
          'isApproved',
          'isHidden',
          'isPremium',
          'location',
          'jobTypes',
          'type',
          'locationCity',
          'locationArea',
          'workExpirienceId',
          'perks',
          'benefits',
        ]
      : [
          'id',
          'title',
          'firstName',
          'lastName',
          'location',
          'createdAt',
          'updatedAt',
          'locationCity',
          'locationArea',
          'contactEmail',
          'contactPhone',
          'contactPerson',
          'isApproved',
          'isHidden',
          'isPremium',
          'jobTypes',
          'type',
          'workExpirienceId',
          'perks',
          'benefits',
          'salaryHourly',
          'hoursPerMonth',
        ];

    const jobTypeIndex = filter.filterBy.indexOf('jobTypes.id');
    const jobTypesIds = filter.filterBy.includes('jobTypes.id')
      ? filter.filterValue[jobTypeIndex].split('|')
      : [];

    const perkIndex = filter.filterBy.indexOf('perks.id');
    const perkIds = filter.filterBy.includes('perks.id')
      ? filter.filterValue[perkIndex].split('|')
      : [];

    const benefitsIndex = filter.filterBy.indexOf('benefits.id');
    const benefitsIds = filter.filterBy.includes('benefits.id')
      ? filter.filterValue[benefitsIndex].split('|')
      : [];

    if (benefitsIndex !== -1) {
      filter.filterBy.splice(benefitsIndex, 1);
      filter.filterValue.splice(benefitsIndex, 1);
      filter.filterType.splice(benefitsIndex, 1);
    }

    if (perkIndex !== -1) {
      filter.filterBy.splice(perkIndex, 1);
      filter.filterValue.splice(perkIndex, 1);
      filter.filterType.splice(perkIndex, 1);
    }

    if (jobTypeIndex !== -1) {
      filter.filterBy.splice(jobTypeIndex, 1);
      filter.filterValue.splice(jobTypeIndex, 1);
      filter.filterType.splice(jobTypeIndex, 1);
    }

    let blacklistedVacanciesIds: string[] = [];
    let blacklistedCompaniesIds: string[] = [];
    let blacklistedResumesIds: string[] = [];

    if (userId) {
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

      blacklistedResumesIds = blacklisted
        .filter((item) => item.entityType == ListEntityTypeEnum.RESUME)
        .map((item) => item.entityId);

      // console.timeEnd('blacklist-query');
    }

    const res = await this.findByFilters(
      this.convertFilterValuesBySalary(filter),
      {
        search: searchFilter.search,
        searchFields: ['title'],
        // withDeleted: searchFilter.withDeleted,
        select,
      },
      (builder) => {
        if (searchFilter.search) {
          console.log('searchFilter.search', searchFilter.search);

          builder.andWhere(
            `
            (
              alias.title ILIKE :search
            )
            `,
            { search: `%${searchFilter.search}%` },
          );
        }

        if (jobTypesIds.length > 0) {
          builder.andWhere(
            `
            EXISTS (
              SELECT 1 FROM jsonb_array_elements("alias"."jobTypes"::jsonb) AS jt
              WHERE jt->>'id' IN (:...query)
            )
            `,
            { query: jobTypesIds },
          );
        }

        if (perkIds.length > 0) {
          builder.andWhere(
            `
            EXISTS (
              SELECT 1 FROM jsonb_array_elements("alias"."perks"::jsonb) AS p
              WHERE p->>'id' IN (:...query)
            )
            `,
            { query: perkIds },
          );
        }

        if (userId) {
          builder.andWhere(
            new Brackets((qb) => {
              qb.where('alias.userId IS NULL').orWhere(
                'alias.userId != :userId',
              );
            }),
            { userId },
          );
        }

        if (benefitsIds.length > 0) {
          builder.andWhere(
            `
            EXISTS (
              SELECT 1 FROM jsonb_array_elements("alias"."benefits"::jsonb) AS b
              WHERE b->>'id' IN (:...query)
            )
            `,
            { query: benefitsIds },
          );
        }

        if (blacklistedVacanciesIds.length > 0) {
          builder.andWhere(
            new Brackets((qb) => {
              qb.where('alias.id IS NULL').orWhere(
                'alias.id NOT IN (:...excludedVacancyIds)',
              );
            }),
            { excludedVacancyIds: blacklistedVacanciesIds },
          );
        }

        if (blacklistedCompaniesIds.length > 0) {
          builder.andWhere(
            new Brackets((qb) => {
              qb.where('alias.companyId IS NULL').orWhere(
                'alias.companyId NOT IN (:...excludedCompanyIds)',
              );
            }),
            { excludedCompanyIds: blacklistedCompaniesIds },
          );
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

        builder.leftJoinAndMapOne(
          'alias.company',
          'company',
          'company',
          'company.id = alias.companyId AND company."deletedAt" IS NULL',
        );
        builder.leftJoinAndSelect('company.logo', 'logo');

        if (type === 'vacancy' || type === 'switcher') {
          builder.andWhere('alias.type = :type', {
            type,
          });
        }

        if (!userId) {
          builder.andWhere('alias.isApproved = true');
          builder.andWhere('alias.isHidden = false');
          // builder.andWhere('company.isApproved = true');
          // builder.andWhere('company.isHidden = false');
        }

        // Removed isPremium ordering as it's NULL for resumes now

        if (!radius || !hlng || !hlat) {
          return builder;
        }

        const radiusInDegrees = (radius * 1000) / 111319.9;

        if (filter.orderBy === 'distance' && hlat != null && hlng != null) {
          builder
            .addSelect(
              `ST_DistanceSphere(alias.locationPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))`,
              'distance',
            )
            .orderBy('distance', filter.orderType)
            .setParameters({ lat: hlat, lng: hlng });
        }

        // if (lat && lng) {
        //   builder.andWhere(
        //     new Brackets((qb) => {
        //       qb.where(`alias."locationHome" IS NULL`).orWhere(`
        //         (alias."locationHome" IS NOT NULL AND
        //           ST_DWithin(
        //             ST_SetSRID(
        //               ST_MakePoint(
        //                 (alias."locationHome"->>'lng')::float,
        //                 (alias."locationHome"->>'lat')::float
        //               ), 4326
        //             ),
        //             ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
        //             :radius
        //           )
        //         )
        //       `);
        //     }),
        //     { lat, lng, radius: radiusInDegrees },
        //   );
        // }

        if ((!lat || !lng) && hlat && hlng) {
          builder.andWhere(
            `ST_DWithin(alias.locationPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :radius)`,
            { lat: hlat, lng: hlng, radius: radiusInDegrees },
          );
        }

        if (lat && lng && hlat && hlng) {
          builder.andWhere(
            new Brackets((qb) => {
              qb.where(`
                alias."locationHome" IS NULL AND
                ST_DWithin(
                  alias.locationPoint,
                  ST_SetSRID(ST_MakePoint(:hlng, :hlat), 4326),
                  :radiusMain
                )
              `).orWhere(`
                alias."locationHome" IS NOT NULL AND
                ST_DWithin(
                  alias.locationPoint,
                  ST_SetSRID(ST_MakePoint(:hlng, :hlat), 4326),
                  :radiusMain
                ) AND
                ST_DWithin(
                  ST_SetSRID(
                    ST_MakePoint(
                      (alias."locationHome"->>'lng')::float,
                      (alias."locationHome"->>'lat')::float
                    ), 4326
                  ),
                  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                  :radiusHome
                )
              `);
            }),
            {
              lat,
              lng,
              hlat,
              hlng,
              radiusMain: radiusInDegrees, // для locationPoint
              radiusHome: radiusInDegrees, // для locationHome
            },
          );
        }

        return builder;
      },
    );

    const mappedData = mapSearchView(
      res.data,
      // mapSearchedResume(res.data, userId),
      lat,
      lng,
      hlat,
      hlng,
      radius,
    ) as any;

    return {
      ...res,
      data: mapDataFormat
        ? mappedData.map((s) => {
            return {
              id: s.id,
              lat: s.lat,
              lng: s.lng,
              isPremium: s.isPremium,
              type: s.type,
            };
          })
        : mappedData,
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
}
