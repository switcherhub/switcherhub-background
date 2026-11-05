import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CompanyEntity } from '../entities/company.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { CompanyCreateDto } from '../dto/company-create.dto';

import {
  FilterResponseInterface,
  SearchFilterInterface,
} from 'src/utils/filter-response.interface';
import { IFilterQuery } from 'typeorm-dynamic-filters';

import { DeleteResult } from 'src/utils/types/delete-result';
import { isUUID } from 'class-validator';
import { CompanyUpdateDto } from '../dto/company-update.dto';
import { ListTypeEnum } from 'src/user-list/types/list-type.enum';
import { UserListSelectService } from 'src/user-list/services/user-list-select.service';
import { mapToUserCompanyDto } from '../dto/user-company.dto';

@Injectable()
export class CompanyService extends ParameterBaseService<CompanyEntity> {
  constructor(
    @InjectRepository(CompanyEntity) repository: Repository<CompanyEntity>,
    genericSearch: TypeOrmSelectService<CompanyEntity>,
    private readonly userListSelectService: UserListSelectService,
  ) {
    super(repository, genericSearch);
  }

  async findByUserId(userId: string): Promise<CompanyEntity[]> {
    return this.repository.find({
      where: {
        userId,
      },
    });
  }

  async countByUser(userId: string): Promise<number> {
    const count = await this.repository.count({
      where: { user: { id: userId }, deletedAt: IsNull() },
    });

    return count;
  }

  async findHistoryByFilters(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
  ): Promise<FilterResponseInterface<CompanyEntity>> {
    filter.filterBy = [...filter.filterBy, 'deletedAt'];
    filter.filterType = [...filter.filterType, 'ge'];
    filter.filterValue = [...filter.filterValue, new Date().toDateString()];

    return this.findByFiltersOverwrite(filter, {
      ...searchFilter,
      withDeleted: true,
    });
  }

  async findByFiltersOverwrite(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
  ): Promise<FilterResponseInterface<CompanyEntity>> {
    const res = await this.findByFilters(filter, {
      search: searchFilter.search,
      searchFields: searchFilter.searchFields,
      withDeleted: searchFilter.withDeleted,
      relations: [
        'employeeNumber',
        'companyType',
        'industry',
        'photos',
        'logo',
        'user',
      ],
    });

    return {
      ...res,
      data: res.data.map((item) => {
        return mapToUserCompanyDto(item) as any;
      }),
    };
  }

  async findOneOrFail(id: string, userId?: string): Promise<CompanyEntity> {
    if (!isUUID(id)) {
      throw new BadRequestException(`id must be uuid`);
    }

    const resume = await this.repository.findOne({
      where: { id },
      relations: [
        'employeeNumber',
        'companyType',
        'industry',
        'photos',
        'logo',
        'user',
      ],
      withDeleted: !userId,
    });

    if (!resume) {
      throw new NotFoundException(`Company with id ${id} not found`);
    }

    // if (userId && (!resume.user || resume.user.id !== userId)) {
    //   throw new ForbiddenException(`Forbidden`);
    // }

    if (userId) {
      const userList = await this.userListSelectService.findByEntityId(
        id,
        userId,
      );

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

  async create(resumeCreateDto: CompanyCreateDto): Promise<CompanyEntity> {
    const order = await this.repository
      .createQueryBuilder('entity')
      .select('MAX(entity.order)', 'max')
      .getRawOne();

    const entity = this.repository.create({
      ...resumeCreateDto,
      order: order.max + 1,
    });

    const resume = await this.repository.save(entity);

    return this.findOneOrFail(resume.id);
  }

  async updateOne(
    id: string,
    resume: CompanyUpdateDto,
  ): Promise<CompanyEntity> {
    await this.findOneOrFail(id);

    resume.id = id;

    await this.repository.save(resume);

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
}
