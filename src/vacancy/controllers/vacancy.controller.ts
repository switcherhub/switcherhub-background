import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { VacancyService } from '../services/vacancy.service';
import { VacancyInterface } from '../types/vacancy.interface';
import { VacancyCreateDto } from '../dto/vacancy-create.dto';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { UserEntity } from 'src/users/entities/user.entity';
import { VacancyUserService } from '../services/vacancy-user.service';
import { VacancyDeleteDto } from '../dto/vacancy-delete.dto';
import { VacancyUpdateDto } from '../dto/vacancy-update.dto';
import { OptionalJwtUserAuthGuard } from 'src/user-auth/guards/optional-jwt-user-auth.guard';
import { VacancyMockService } from '../services/vacancy-mock.service';
import { CompanyService } from 'src/company/services/company.service';
import { createHash } from 'crypto';

@Controller('vacancy')
export class VacancyController {
  constructor(
    private readonly vacancyService: VacancyService,
    private readonly vacancyUserService: VacancyUserService,
    private readonly vacancyMockService: VacancyMockService,
    private readonly companyService: CompanyService,
  ) {}

  @Get('search/authorized')
  @UseGuards(JwtUserAuthGuard)
  async searchAuthorized(
    @Query() query: any,
    @Query('search') search: string,
    @GetUser() user: UserEntity,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius: number,
    @Query('map') mapDataFormat: boolean,
  ): Promise<FilterResponseInterface<VacancyInterface>> {
    const cacheKey = this.generateCacheKeyFromQuery('vs', query);

    const filter = parseQueryFilters(query);

    filter.filterBy.push('isHidden');
    filter.filterType.push('eq');
    filter.filterValue.push('false');

    const per_page = query.per_page;

    filter.per_page = per_page
      ? Number(per_page)
      : mapDataFormat
        ? 1000
        : Number(per_page);

    return this.vacancyService.findByFiltersUser(
      filter,
      {
        search,
        searchFields: ['title'],
      },
      user.id,
      lat,
      lng,
      radius,
      mapDataFormat,
      false,
      false,
      cacheKey,
    );
  }

  generateCacheKeyFromQuery(prefix: string, query: any): string {
    const sortedQuery = Object.keys(query)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = query[key];
          return acc;
        },
        {} as Record<string, any>,
      );

    const stringified = JSON.stringify(sortedQuery);
    const hash = createHash('md5').update(stringified).digest('hex');

    return `${prefix}:${hash}`;
  }

  @Get('search')
  async search(
    @Query() query: any,
    @Query('search') search: string,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius: number,
    @Query('map') mapDataFormat: boolean,
  ): Promise<FilterResponseInterface<VacancyInterface>> {
    const cacheKey = this.generateCacheKeyFromQuery('vs', query);

    const filter = parseQueryFilters(query);
    const per_page = query.per_page;

    filter.per_page = per_page
      ? Number(per_page)
      : mapDataFormat
        ? 1000
        : Number(per_page);

    filter.filterBy.push('isHidden');
    filter.filterType.push('eq');
    filter.filterValue.push('false');

    // console.log('search', filter);
    return this.vacancyService.findByFiltersUser(
      filter,
      {
        search,
        searchFields: ['title'],
      },
      undefined,
      lat,
      lng,
      radius,
      mapDataFormat,
      false,
      false,
      cacheKey,
    );
  }

  @Get()
  @UseGuards(JwtUserAuthGuard)
  async find(
    @Query() query: any,
    @Query('search') search: string,
    @GetUser() user: UserEntity,
  ): Promise<FilterResponseInterface<VacancyInterface>> {
    return this.vacancyService.findUserVacancies(
      parseQueryFilters(query),
      {
        search,
        searchFields: ['title'],
      },
      user.id,
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtUserAuthGuard)
  async findOne(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Req() req: Request,
  ): Promise<VacancyInterface> {
    const fingerprint = req.headers['x-fingerprint'];

    return this.vacancyService.findOne(id, fingerprint, user?.id);
  }

  @Post('mock')
  @UseGuards(JwtUserAuthGuard)
  async createMock(@GetUser() user: UserInterface): Promise<VacancyInterface> {
    const mock = await this.vacancyMockService.generateMock();
    const companies = await this.companyService.findByUserId(user.id);
    const company = companies[Math.floor(Math.random() * companies.length)];

    if (!company) {
      throw new BadRequestException(
        'You need to create a company before creating a vacancy.',
      );
    }

    mock.companyId = company.id;

    return this.vacancyUserService.createByUser(mock, user.id);
  }

  @Post()
  @UseGuards(JwtUserAuthGuard)
  async create(
    @Body() resume: VacancyCreateDto,
    @GetUser() user: UserInterface,
  ): Promise<VacancyInterface> {
    return this.vacancyUserService.createByUser(resume, user.id);
  }

  @Put(':id/premium')
  @UseGuards(JwtUserAuthGuard)
  async setPremium(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Body('isPremium') isPremium: boolean,
  ): Promise<VacancyInterface> {
    return this.vacancyUserService.setPremium(id, user.id, isPremium);
  }

  @Put(':id/visible')
  @UseGuards(JwtUserAuthGuard)
  async setVisible(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Body('isHidden') isHidden: boolean,
  ): Promise<VacancyInterface> {
    return this.vacancyUserService.setVisibility(id, user.id, isHidden);
  }

  @Put(':id')
  @UseGuards(JwtUserAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() data: VacancyUpdateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.vacancyUserService.updateByUser(id, data, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtUserAuthGuard)
  async delete(
    @Param('id') id: string,
    @Body() body: VacancyDeleteDto,
    @GetUser() user: UserInterface,
  ) {
    return this.vacancyUserService.deleteByUser(id, user.id, body.noteDeletion);
  }
}
