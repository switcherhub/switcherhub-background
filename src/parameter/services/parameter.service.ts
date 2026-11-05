import {
  Repository,
  DeleteResult,
  FindOptionsWhere,
  DeepPartial,
  SelectQueryBuilder,
  FindOptionsOrder,
  DataSource,
} from 'typeorm';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ParameterBaseEntity } from '../entities/parameter.entity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { IFilterQuery } from 'typeorm-dynamic-filters';
import {
  FilterResponseInterface,
  SearchFilterInterface,
} from 'src/utils/filter-response.interface';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { AppDataSource } from 'src/database/config';

@Injectable()
export abstract class ParameterBaseService<T extends ParameterBaseEntity> {
  constructor(
    protected readonly repository: Repository<T>,
    private readonly genericSearch: TypeOrmSelectService<T>,
  ) {}

  async findAll(take?: number, skip?: number): Promise<T[]> {
    return this.repository.find({
      take,
      skip,
      order: {
        order: 'ASC',
      } as FindOptionsOrder<T>,
    });
  }

  async find(
    page: number,
    search?: string,
  ): Promise<FilterResponseInterface<T>> {
    return this.genericSearch.search(this.repository, {
      page: page,
      searchFields: ['title'],
      search: search,
      orderBy: ['order'],
      orderType: ['ASC'],
    });
  }

  async findByField<K extends keyof T>(field: K, value: T[K]): Promise<T[]> {
    return this.repository.find({
      where: {
        [field]: value,
      } as FindOptionsWhere<T>,
    });
  }

  async findOneByField<K extends keyof T>(
    field: K,
    value: T[K],
  ): Promise<T | null> {
    return this.repository.findOne({
      where: {
        [field]: value,
      } as FindOptionsWhere<T>,
    });
  }

  async findByFilters(
    filter: IFilterQuery,
    searchFilter?: SearchFilterInterface,
    filterFn?: (builder: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
  ): Promise<FilterResponseInterface<T>> {
    return this.genericSearch.search(
      this.repository,
      {
        page: filter.page,
        perPage: filter.per_page,
        orderBy: filter.orderBy ? [filter.orderBy] : [],
        orderType: filter.orderType ? [filter.orderType] : [],
        filterBy: filter.filterBy,
        filterType: filter.filterType,
        filterValue: filter.filterValue,
        searchFields: searchFilter?.searchFields,
        search: searchFilter?.search,
        withDeleted: searchFilter?.withDeleted,
        relations: searchFilter?.relations,
        select: searchFilter?.select,
      },
      filterFn,
    );
  }

  async restore(id: string): Promise<T> {
    const item = await this.findOneOrFail(id);

    item.deletedAt = null;

    return this.repository.save(item);
  }

  async findOneOrFail(
    id: string,
    userId?: string,
    relations: string[] = [],
  ): Promise<T> {
    if (!isUUID(id)) {
      throw new BadRequestException(`id ${id} is not a valid UUID`);
    }

    const whereCondition: FindOptionsWhere<T> = { id } as FindOptionsWhere<T>;

    const entity = await this.repository.findOne({
      where: whereCondition,
      relations,
    });

    if (!entity) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }

    return entity;
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const order = await this.repository
      .createQueryBuilder('entity')
      .select('MAX(entity.order)', 'max')
      .getRawOne();

    const entity = this.repository.create({ ...data, order: order.max + 1 });

    return this.repository.save(entity);
  }

  async save(id: string, data: any): Promise<T> {
    await this.findOneOrFail(id);
    await this.repository.save({
      ...data,
      id,
    });
    return this.findOneOrFail(id);
  }

  async update(id: string, data: QueryDeepPartialEntity<T>): Promise<T> {
    try {
      await this.repository.update(id, data);

      return this.findOneOrFail(id);
    } catch (error) {
      console.error('Error updating entity:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    await this.findOneOrFail(id);
    return this.repository.delete(id);
  }

  async move(id: string, direction: number): Promise<{ message: string }> {
    const entity = await this.findOneOrFail(id);
    const allEntities = await this.find(1);

    const positionList = allEntities.data.map((e) => e.order);

    const currentIndex = positionList.indexOf(entity.order);

    if (currentIndex === -1) {
      throw new NotFoundException(`Entity with id ${id} not found in list`);
    }

    let newIndex = currentIndex + direction;

    newIndex = Math.max(0, Math.min(newIndex, positionList.length - 1));

    const targetPosition = positionList[newIndex];

    if (entity.order === targetPosition) {
      return { message: 'Position unchanged' };
    }

    return this.movePosition(entity.order, targetPosition);
  }

  async movePosition(
    oldPosition: number,
    newPosition: number,
  ): Promise<{
    message: string;
  }> {
    if (oldPosition === newPosition) {
      return { message: 'Position moved successfully' };
    }

    const movingEntity = await this.repository.findOne({
      where: { order: oldPosition } as FindOptionsWhere<T>,
    });

    if (!movingEntity) {
      throw new NotFoundException(`No entity found at position ${oldPosition}`);
    }

    const isMovingUp = newPosition < oldPosition;
    await this.repository.query(`
      UPDATE ${this.repository.metadata.tableName}
      SET "order" = "order" ${isMovingUp ? '+ 1' : '- 1'}
      WHERE "order" BETWEEN ${Math.min(oldPosition, newPosition)} 
        AND ${Math.max(oldPosition, newPosition)}
        AND "order" != ${oldPosition};
    `);

    await this.repository.update(movingEntity.id, {
      order: newPosition,
    } as any);

    return { message: 'Position moved successfully' };
  }

  async transfer(oldEntityId: string, newEntityId: string): Promise<void> {
    const entityType = this.repository.target;

    if (typeof entityType !== 'function') {
      throw new Error(
        `Entity type must be a class, but got ${typeof entityType}`,
      );
    }

    const oldEntity = await this.findOneOrFail(oldEntityId);
    const newEntity = await this.findOneOrFail(newEntityId);

    const relations = findEntityRelations(AppDataSource, entityType);
    console.log(`ℹ️ Tranfering ${entityType.name}`);
    for (const relation of relations.inverseRelations) {
      const entityMetadata = AppDataSource.entityMetadatas.find(
        (meta) => meta.name === relation.entity,
      );

      if (!entityMetadata) {
        console.error(`❌ Metadata not found for entity: ${relation.entity}`);
        continue;
      }

      for (const fieldName of relation.relations) {
        const manyToManyRelation = entityMetadata.manyToManyRelations.find(
          (r) => r.propertyName === fieldName,
        );

        if (manyToManyRelation) {
          // ✅ Отримуємо правильну JOIN-таблицю
          const joinTableName = manyToManyRelation.joinTableName;
          console.log('ℹ️ Join table', joinTableName);
          // ✅ Отримуємо правильні назви колонок у JOIN-таблиці
          const joinColumn = manyToManyRelation.joinColumns[0]?.propertyPath;
          const inverseJoinColumn =
            manyToManyRelation.inverseJoinColumns[0]?.propertyPath;

          if (!joinColumn || !inverseJoinColumn) {
            console.error(
              `❌ Cannot determine join columns for ${joinTableName}`,
            );
            continue;
          }

          // 🔹 Отримуємо всі `resumeId`, які були прив'язані до `oldEntityId`
          let oldReferences = await AppDataSource.createQueryBuilder()
            .select([`${joinTableName}.${joinColumn}`])
            .from(joinTableName, joinTableName)
            .where(`${joinTableName}.${inverseJoinColumn} = :oldEntityId`, {
              oldEntityId,
            })
            .getRawMany();
          oldReferences = oldReferences.map((r) => r[Object.keys(r)[0]]);
          if (oldReferences.length === 0) {
            console.log(
              `ℹ️ No existing references found in ${joinTableName}, skipping insert.`,
            );
            continue;
          }

          console.log(
            `🔄 Deleting old ManyToMany relation from ${joinTableName} by ${inverseJoinColumn}`,
          );

          // 🔹 Видаляємо всі старі зв’язки (тепер без `id`)
          await AppDataSource.createQueryBuilder()
            .delete()
            .from(joinTableName)
            .where(`${inverseJoinColumn} = :oldEntityId`, { oldEntityId })
            .execute();

          console.log(
            `✅ Insert new ManyToMany relation into ${joinTableName} ${joinColumn} `,
          );

          // return;
          // 🔹 Вставляємо нові зв’язки
          await AppDataSource.createQueryBuilder()
            .insert()
            .into(joinTableName)
            .values(
              oldReferences.map((row) => ({
                [joinColumn]: row, // resumeId
                [inverseJoinColumn]: newEntityId, // Замінюємо oldEntityId на newEntityId
              })),
            )
            .execute();
        } else {
          // ✅ Отримуємо правильну назву стовпця для `ManyToOne`
          const relationMetadata = entityMetadata.relations.find(
            (r) => r.propertyName === fieldName,
          );
          const columnName =
            relationMetadata?.joinColumns[0]?.referencedColumn?.databaseName;

          if (!columnName) {
            console.error(
              `❌ Cannot determine column name for ${relation.entity}.${fieldName}`,
            );
            continue;
          }

          console.log(`🔄 Updating ${relation.entity}.${columnName}`);

          // 🔹 Оновлення ManyToOne та OneToMany
          await AppDataSource.createQueryBuilder()
            .update(relation.entity)
            .set({ [columnName]: newEntityId })
            .where(`${columnName} = :oldEntityId`, { oldEntityId })
            .execute();
        }
      }
    }

    console.log('✅ All references updated successfully.');
  }
}

export const findEntityRelations = (
  dataSource: DataSource,
  targetEntity: Function,
) => {
  if (!dataSource.isInitialized) {
    throw new Error(
      'Database is not initialized! Run `await AppDataSource.initialize()` before calling this function.',
    );
  }

  const metadata = dataSource.entityMetadatas;

  // 🔹 Отримуємо всі прямі зв'язки
  const directRelations =
    metadata
      .find((meta) => meta.target === targetEntity)
      ?.relations.map((relation) => relation.propertyName) || [];

  // 🔹 Отримуємо всі сутності, які містять посилання на targetEntity
  const inverseRelations = metadata
    .filter((meta) =>
      meta.relations.some(
        (relation) => relation.inverseEntityMetadata.target === targetEntity,
      ),
    )
    .map((meta) => ({
      entity:
        typeof meta.target === 'function'
          ? meta.target.name
          : String(meta.target), // 🔥 Фікс помилки
      relations: meta.relations
        .filter(
          (relation) => relation.inverseEntityMetadata.target === targetEntity,
        )
        .map((relation) => relation.propertyName),
    }));

  return {
    directRelations,
    inverseRelations,
  };
};
