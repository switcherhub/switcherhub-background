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
import { ResumeMockService } from '../services/resume-mock.service';
import { assertNotFabricatingInProd } from '../../app/feature-flags';
import { ApiKeyGuard } from 'src/app/guards/api-key.guard';
import { ResumeInterface } from '../types/resume.interface';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { ResumeService } from '../services/resume.service';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { DeleteResult } from 'src/utils/types/delete-result';
import { ResumeUpdateDto } from '../dto/resume-update.dto';
import { ResumeApproveDto } from '../dto/resume-approve.dto';

@Controller('admin/resume')
export class ResumeAdminController {
  constructor(
    private readonly resumeMockService: ResumeMockService,
    private readonly resumeService: ResumeService,
  ) {}

  @Get('history')
  @UseGuards(JwtOperatorAuthGuard)
  async findHistory(
    @Query() query: any,
    @Query('search') search: string,
  ): Promise<FilterResponseInterface<ResumeInterface>> {
    const filter = parseQueryFilters(query);

    return this.resumeService.findHistoryByFilters(filter, {
      search,
      searchFields: [],
    });
  }

  @Post('generate')
  @UseGuards(ApiKeyGuard)
  async generateMockResumes(@Body('count') count: number) {
    assertNotFabricatingInProd('resume.generateMockResumes');
    return await this.resumeMockService.generateMockResumes(count);
  }

  @Get()
  @UseGuards(JwtOperatorAuthGuard)
  async find(
    @Query() query: any,
    @Query('search') search: string,
  ): Promise<FilterResponseInterface<ResumeInterface>> {
    const filter = parseQueryFilters(query);
    return this.resumeService.findByFiltersOverwrite(filter, {
      search,
      searchFields: [],
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<DeleteResult> {
    return this.resumeService.deleteOne(id);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() approve: ResumeApproveDto) {
    return this.resumeService.save(id, approve);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() resume: ResumeUpdateDto) {
    return this.resumeService.updateOne(id, resume);
  }
}
