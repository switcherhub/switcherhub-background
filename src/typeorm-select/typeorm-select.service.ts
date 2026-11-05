import { Repository, Brackets, IsNull, SelectQueryBuilder } from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { FilterBuilder, IFilterQuery } from 'typeorm-dynamic-filters';
import {
  FilterDto,
  FilterResponseInterface,
} from 'src/utils/filter-response.interface';

@Injectable()
export class TypeOrmSelectService<T> {
  async search(
    repository: Repository<T>,
    filter: FilterDto<T>,
    filterFn?: (builder: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
  ): Promise<FilterResponseInterface<T>> {
    const filterQuery: IFilterQuery = {
      filterBy: filter.filterBy || [],
      filterType: filter.filterType || [],
      filterValue: filter.filterValue || [],
      page: filter.page,
      per_page: filter.perPage || Number(process.env.DEFAULT_PAGE_SIZE),
      orderBy: '',
      orderType: 'ASC',
    };

    const filterRelation = {
      filterBy: [],
      filterValue: [],
      filterType: [],
    };

    for (let i = 0; i < filter.filterBy?.length; i++) {
      if (filter.filterType[i] === 'arr' && filter.filterValue[i]) {
        filterRelation.filterBy.push(filter.filterBy[i]);
        filterRelation.filterValue.push(filter.filterValue[i]);
        filterRelation.filterType.push(filter.filterType[i]);

        filter.filterBy.splice(i, 1);
        filter.filterValue.splice(i, 1);
        filter.filterType.splice(i, 1);

        i--;
      }
    }

    const filterBuilder = new FilterBuilder(repository, 'alias');
    let queryBuilder = filterBuilder.build(filterQuery);

    if (filter.select) {
      queryBuilder.select(filter.select.map((field) => `alias.${field}`));
    }

    if (filter.withDeleted) {
      queryBuilder.withDeleted();
    }

    if (filter.search && filter.searchFields?.length > 0) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          filter.searchFields.forEach((field, index) => {
            const paramName = `search${index}`;
            qb.orWhere(`alias.${field} ILIKE :${paramName}`, {
              [paramName]: `%${filter.search}%`,
            });
          });
        }),
      );
    }

    for (let i = 0; i < filter.filterBy?.length; i++) {
      if (filter.filterValue[i] === 'null') {
        filter.filterValue[i] = IsNull();
      }
    }

    // queryBuilder.andWhere(
    //   new Brackets((qb) => {
    //     for (let i = 0; i < filterRelation.filterBy?.length; i++) {
    //       if (
    //         filterRelation.filterType[i] === 'arr' &&
    //         filterRelation.filterValue[i]
    //       ) {
    //         const param = filterRelation.filterBy[i];
    //         const splited = param.split('.');

    //         if (splited.length < 2) {
    //           throw new BadRequestException(
    //             `To provided ${splited[0]}, you must specify the field with “.”`,
    //           );
    //         }

    //         const query = filterRelation.filterValue[i].split('|');
    //         qb.orWhere(`${param} IN (:...query${i})`, { [`query${i}`]: query });
    //       }
    //     }
    //   }),
    // );

    queryBuilder.andWhere(
      new Brackets((qb) => {
        for (let i = 0; i < filterRelation.filterBy?.length; i++) {
          if (
            filterRelation.filterType[i] === 'arr' &&
            filterRelation.filterValue[i]
          ) {
            const param = filterRelation.filterBy[i];
            const values = filterRelation.filterValue[i].split('|');
            const key = `query_${i}`;

            // Якщо це перший фільтр — через .where(), далі — через .andWhere()
            if (i === 0) {
              qb.where(`${param} IN (:...${key})`, { [key]: values });
            } else {
              qb.andWhere(`${param} IN (:...${key})`, { [key]: values });
            }
          }
        }
      }),
    );

    if (
      filter.orderBy &&
      filter.orderType &&
      filter.orderBy.length === filter.orderType.length
    ) {
      filter.orderBy.forEach((field, index) => {
        queryBuilder.addOrderBy(`alias.${field}`, filter.orderType[index]);
      });
    }

    if (filterFn) {
      queryBuilder = await filterFn(queryBuilder);
    }

    if (
      repository.metadata.relations &&
      repository.metadata.relations.length > 0
    ) {
      try {
        repository.metadata.relations
          .filter(
            (relation) =>
              relation.isEager || // Автоматичне завантаження
              filter?.relations?.some((r) =>
                r.startsWith(relation.propertyName),
              ), // Перевіряємо вкладені зв'язки
          )
          .forEach((relation) => {
            queryBuilder.leftJoinAndSelect(
              `alias.${relation.propertyName}`,
              relation.propertyName,
            );

            // Додаємо вкладені зв’язки (наприклад, company.logo)
            (filter?.relations ?? [])
              .filter((r) => r.startsWith(`${relation.propertyName}.`))
              .forEach((nestedRelation) => {
                const nestedProperty = nestedRelation.split('.')[1]; // Витягуємо вкладене поле
                queryBuilder.leftJoinAndSelect(
                  `${relation.propertyName}.${nestedProperty}`,
                  nestedProperty,
                );
              });
          });
      } catch (e) {
        console.log('eererer', e);
      }
    }

    const [query, parameters] = queryBuilder.getQueryAndParameters();

    const resolved = query.replace(/\$(\d+)/g, (_, index) => {
      const param = parameters[Number(index) - 1];
      return typeof param === 'string' ? `'${param}'` : param;
    });

    // console.log(resolved);

    queryBuilder
      .take(filterQuery.per_page)
      .skip((filter.page - 1) * filterQuery.per_page);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: filter.page,
      perPage: filterQuery.per_page,
      pageCount: Math.ceil(total / filterQuery.per_page),
    };
  }
}
