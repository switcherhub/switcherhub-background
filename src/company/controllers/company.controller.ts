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
  UseGuards,
} from '@nestjs/common';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { CompanyService } from '../services/company.service';
import { CompanyInterface } from '../types/company.interface';
import { CompanyCreateDto } from '../dto/company-create.dto';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { UserEntity } from 'src/users/entities/user.entity';
import { CompanyUserService } from '../services/company-user.service';
import { CompanyUpdateDto } from '../dto/company-update.dto';
import { OptionalJwtUserAuthGuard } from 'src/user-auth/guards/optional-jwt-user-auth.guard';
import { CompanyMockService } from '../services/company-mock.service';
import { assertNotFabricatingInProd } from '../../app/feature-flags';

@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly companyUserService: CompanyUserService,
    private readonly companyMockService: CompanyMockService,
  ) {}

  @Get('search')
  async search(
    @Query() query: any,
    @Query('search') search: string,
  ): Promise<FilterResponseInterface<CompanyInterface>> {
    const filter = parseQueryFilters(query);
    return this.companyService.findByFiltersOverwrite(filter, {
      search,
      searchFields: ['name'],
    });
  }

  @Get(':id')
  @UseGuards(OptionalJwtUserAuthGuard)
  async findOne(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ): Promise<CompanyInterface> {
    return this.companyService.findOneOrFail(id, user?.id);
  }

  @Get()
  @UseGuards(JwtUserAuthGuard)
  async find(
    @Query() query: any,
    @Query('search') search: string,
    @GetUser() user: UserEntity,
  ): Promise<FilterResponseInterface<CompanyInterface>> {
    const filter = parseQueryFilters(query);

    filter.filterBy = [...filter.filterBy, 'userId'];
    filter.filterType = [...filter.filterType, 'eq'];
    filter.filterValue = [...filter.filterValue, user.id];

    return this.companyService.findByFiltersOverwrite(filter, {
      search,
      searchFields: ['name'],
    });
  }

  @Post('mock')
  @UseGuards(JwtUserAuthGuard)
  async createMcok(@GetUser() user: UserInterface): Promise<CompanyInterface> {
    assertNotFabricatingInProd('company.createMock');
    const company = await this.companyMockService.generateMockResume();

    return this.companyUserService.createByUser(company, user.id);
  }

  @Post()
  @UseGuards(JwtUserAuthGuard)
  async create(
    @Body() resume: CompanyCreateDto,
    @GetUser() user: UserInterface,
  ): Promise<CompanyInterface> {
    return this.companyUserService.createByUser(resume, user.id);
  }

  @Put(':id')
  @UseGuards(JwtUserAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() data: CompanyUpdateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.companyUserService.updateByUser(id, data, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtUserAuthGuard)
  async delete(@Param('id') id: string, @GetUser() user: UserInterface) {
    return this.companyUserService.deleteByUser(id, user.id);
  }
}
