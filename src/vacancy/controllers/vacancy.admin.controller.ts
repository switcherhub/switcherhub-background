import {
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
import { VacancyMockService } from '../services/vacancy-mock.service';
import { ApiKeyGuard } from 'src/app/guards/api-key.guard';
import { VacancyInterface } from '../types/vacancy.interface';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { VacancyService } from '../services/vacancy.service';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { DeleteResult } from 'src/utils/types/delete-result';
import { VacancyUpdateDto } from '../dto/vacancy-update.dto';
import { VacancyApproveDto } from '../dto/vacancy-approve.dto';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';

@Controller('admin/vacancy')
export class VacancyAdminController {
  constructor(
    private readonly vacancyMockService: VacancyMockService,
    private readonly vacancyService: VacancyService,
  ) {}

  @Get('history')
  @UseGuards(JwtOperatorAuthGuard)
  async findHistory(
    @Query() query: any,
    @Query('search') search: string,
  ): Promise<FilterResponseInterface<VacancyInterface>> {
    const filter = parseQueryFilters(query);

    return this.vacancyService.findHistoryByFilters(filter, {
      search,
      searchFields: ['title'],
    });
  }

  @Post('generate')
  @UseGuards(ApiKeyGuard)
  async generateMockResumes(@Body('count') count: number) {
    return await this.vacancyMockService.generateMockResumes(count);
  }

  @Get()
  @UseGuards(JwtOperatorAuthGuard)
  async find(
    @Query() query: any,
    @Query('search') search: string,
  ): Promise<FilterResponseInterface<VacancyInterface>> {
    const filter = parseQueryFilters(query);
    return this.vacancyService.findByFiltersAdmin(filter, {
      search,
      searchFields: ['title'],
    });
  }

  @Delete(':id')
  @UseGuards(JwtOperatorAuthGuard)
  async delete(@Param('id') id: string): Promise<DeleteResult> {
    return this.vacancyService.deleteOne(id);
  }

  @Put(':id/approve')
  @UseGuards(JwtOperatorAuthGuard)
  async approve(@Param('id') id: string, @Body() approve: VacancyApproveDto) {
    return this.vacancyService.save(id, approve);
  }

  @Put('allow-chat')
  @UseGuards(JwtUserAuthGuard)
  async updateMany(
    @Body('allowChat') allowChat: boolean,
    @Body('companyId') companyId: string,
  ) {
    return this.vacancyService.updateAllowChat(companyId, allowChat);
  }

  @Put(':id')
  @UseGuards(JwtOperatorAuthGuard)
  async update(@Param('id') id: string, @Body() resume: VacancyUpdateDto) {
    return this.vacancyService.updateOne(id, resume);
  }
}
