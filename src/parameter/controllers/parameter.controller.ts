import {
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Type,
  Controller,
  Inject,
  UsePipes,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AbstractValidationPipe } from 'src/utils/abstract-validation.pipe';
import {
  FilterResponseInterface,
  SearchFilterInterface,
} from 'src/utils/filter-response.interface';
import { DeepPartial, DeleteResult } from 'typeorm';
import { IFilterQuery, parseQueryFilters } from 'typeorm-dynamic-filters';

export function ParameterBaseController<
  T,
  CreateDto extends object,
  UpdateDto extends object,
  S extends {
    findAll: () => Promise<T[]>;
    find: (
      page: number,
      search?: string,
    ) => Promise<FilterResponseInterface<T>>;
    findByFilters: (
      filter: IFilterQuery,
      searchFilter: SearchFilterInterface,
    ) => Promise<FilterResponseInterface<T>>;
    findOneOrFail: (id: string) => Promise<T>;
    create: (dto: DeepPartial<T>) => Promise<T>;
    update: (id: string, dto: DeepPartial<T>) => Promise<T>;
    delete: (id: string) => Promise<DeleteResult>;
    move: (id: string, direction: number) => Promise<{ message: string }>;
    restore: (id: string) => Promise<T>;
    transfer: (oldEntityId: string, newEntityId: string) => Promise<void>;
    movePosition: (
      oldPosition: number,
      newPosition: number,
    ) => Promise<{ message: string }>;
  },
>(
  entity: Type<T>,
  createDto: Type<CreateDto>,
  updateDto: Type<UpdateDto>,
  service: Type<S>,
  route: string,
  searchFields?: Extract<keyof T, string>[],
): Type<any> {
  @Controller(route)
  class BaseController {
    constructor(@Inject(service) protected readonly service: S) {}

    @Get()
    async find(
      @Query() query: any,
      @Query('search') search: string,
    ): Promise<FilterResponseInterface<T>> {
      const filter = parseQueryFilters(query);
      return this.service.findByFilters(filter, { search, searchFields });
    }

    @Get('all')
    async findAll(): Promise<T[]> {
      return this.service.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<T> {
      return this.service.findOneOrFail(id);
    }

    @Post()
    @UsePipes(new AbstractValidationPipe(createDto))
    async create(@Body() data: CreateDto): Promise<T> {
      return this.service.create(data as unknown as DeepPartial<T>);
    }

    @Put(':id/transfer')
    async transfer(
      @Param('id') id: string,
      @Body('newEntityId') newEntityId: string,
    ) {
      return this.service.transfer(id, newEntityId);
    }

    @Put(':id/restore')
    async restore(@Param('id') id: string) {
      return this.service.restore(id);
    }

    @Put(':id/move')
    async movePosition(
      @Param('id') id: string,
      @Body('direction') direction: number,
    ) {
      return this.service.move(id, Number(direction));
    }

    @Put(':id')
    @UsePipes(new AbstractValidationPipe(updateDto))
    async update(@Param('id') id: string, @Body() data: UpdateDto): Promise<T> {
      return this.service.update(id, data as unknown as DeepPartial<T>);
    }

    @Delete(':id')
    async delete(@Param('id') id: string): Promise<DeleteResult> {
      return this.service.delete(id);
    }
  }

  return BaseController;
}
