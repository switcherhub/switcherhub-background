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
import { CompanyMockService } from '../services/company-mock.service';
import { ApiKeyGuard } from 'src/app/guards/api-key.guard';
import { CompanyInterface } from '../types/company.interface';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { CompanyService } from '../services/company.service';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { DeleteResult } from 'src/utils/types/delete-result';
import { CompanyUpdateDto } from '../dto/company-update.dto';
import { CompanyApproveDto } from '../dto/company-approve.dto';

@Controller('admin/company')
export class CompanyAdminController {
  constructor(
    private readonly resumeMockService: CompanyMockService,
    private readonly resumeService: CompanyService,
  ) {}

  @Get('history')
  @UseGuards(JwtOperatorAuthGuard)
  async findHistory(
    @Query() query: any,
    @Query('search') search: string,
  ): Promise<FilterResponseInterface<CompanyInterface>> {
    const filter = parseQueryFilters(query);

    return this.resumeService.findHistoryByFilters(filter, {
      search,
      searchFields: ['name'],
    });
  }

  @Post('generate')
  @UseGuards(ApiKeyGuard)
  async generateMockResumes(@Body('count') count: number) {
    return await this.resumeMockService.generateMockResumes(count);
  }

  @Get()
  @UseGuards(JwtOperatorAuthGuard)
  async find(
    @Query() query: any,
    @Query('search') search: string,
  ): Promise<FilterResponseInterface<CompanyInterface>> {
    const filter = parseQueryFilters(query);
    return this.resumeService.findByFiltersOverwrite(filter, {
      search,
      searchFields: ['name'],
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<DeleteResult> {
    return this.resumeService.deleteOne(id);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() approve: CompanyApproveDto) {
    return this.resumeService.save(id, approve);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() resume: CompanyUpdateDto) {
    return this.resumeService.updateOne(id, resume);
  }
}
