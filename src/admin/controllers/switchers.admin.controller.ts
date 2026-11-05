import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SwitcherListItemDto } from '../dto/switcher-list-item.dto';
import { SwitchersSummaryDto } from '../dto/switchers-summary.dto';
import { UpdateSwitcherDto } from '../dto/update-switcher.dto';
import { SwitchersAdminService } from '../services/switchers-admin.service';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';

@Controller('admin/switchers')
@UseGuards(JwtOperatorAuthGuard)
export class SwitchersAdminController {
  constructor(private readonly switchersAdminService: SwitchersAdminService) {}

  @Get('summary')
  async getSummary(): Promise<SwitchersSummaryDto> {
    return this.switchersAdminService.getSummary();
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('search') search?: string,
  ): Promise<FilterResponseInterface<SwitcherListItemDto>> {
    return this.switchersAdminService.findAll(page, perPage, search);
  }

  @Get(':userId')
  async findOne(@Param('userId') userId: string): Promise<SwitcherListItemDto> {
    return this.switchersAdminService.findOne(userId);
  }

  @Put(':userId')
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateSwitcherDto,
  ): Promise<SwitcherListItemDto> {
    return this.switchersAdminService.update(userId, dto);
  }
}
